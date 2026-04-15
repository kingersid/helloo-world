import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, payload } = await req.json()
    const { mobile } = payload

    if (!mobile) throw new Error('Mobile number required')
    let cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile

    // --- ACTION: REQUEST OTP ---
    if (action === 'request-otp') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString()
      
      console.log(`[OTP] Request for mobile: ${cleanMobile}, action: ${action}`);

      // Hash OTP using Web Crypto API
      const encoder = new TextEncoder()
      const data = encoder.encode(otp)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const otpHashing = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      // 1. Send OTP via MSG91
      const msg91Key = Deno.env.get('MSG91_AUTH_KEY')
      let msg91Status = 'not_sent'
      let msg91Details = null

      if (msg91Key) {
        // Using GET method with authkey in URL - highly reliable for MSG91 v5/otp
        const widgetId = Deno.env.get('MSG91_WIDGET_ID');
        const msg91Url = `https://control.msg91.com/api/v5/otp?authkey=${msg91Key}&mobile=${cleanMobile}&otp=${otp}${widgetId ? `&widgetId=${widgetId}` : ''}`;
        console.log(`[OTP] Sending via MSG91 (GET): ${msg91Url.replace(msg91Key, '******').replace(otp, '******')}`);
        
        try {
          const msg91Response = await fetch(msg91Url, { method: 'GET' })
          const msg91Data = await msg91Response.json()
          msg91Status = msg91Data.type === 'success' ? 'success' : 'failed'
          msg91Details = msg91Data
          console.log(`[OTP] MSG91 Response: ${JSON.stringify(msg91Data)}`);
        } catch (e) {
          console.error(`[OTP] MSG91 Fetch Error: ${e.message}`);
          msg91Status = 'error'
          msg91Details = { error: e.message }
        }
      }

      // If MSG91 is configured, do not pretend success when delivery fails.
      if (msg91Key && msg91Status !== 'success') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to send OTP via MSG91',
          msg91_status: msg91Status,
          msg91_details: msg91Details
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 2. Save hashed OTP to database
      const { error: dbError } = await supabaseClient
        .from('otp_codes')
        .insert([{
          phone_number: cleanMobile,
          code: otpHashing,
          expires_at: expiresAt
        }])

      if (dbError) throw dbError

      console.log(`[AUTH] OTP generated for ${cleanMobile}: ${otp}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'OTP processed',
        msg91_status: msg91Status,
        msg91_details: msg91Details
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // --- ACTION: VERIFY OTP ---
    if (action === 'verify-otp') {
      const { otp } = payload
      if (!otp) throw new Error('OTP required')

      // Hash incoming OTP
      const encoder = new TextEncoder()
      const data = encoder.encode(otp)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const otpHashing = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      // 1. Check database for valid, unused OTP
      const { data: results, error: fetchError } = await supabaseClient
        .from('otp_codes')
        .select('*')
        .eq('phone_number', cleanMobile)
        .eq('code', otpHashing)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError
      if (!results || results.length === 0) {
        throw new Error('Invalid or expired OTP')
      }

      // 2. Mark as used
      await supabaseClient
        .from('otp_codes')
        .update({ used: true })
        .eq('id', results[0].id)

      // 3. Get or create customer account
      let { data: customer, error: customerError } = await supabaseClient
        .from('customer_accounts')
        .select('*')
        .eq('mobile', cleanMobile)
        .single()

      if (!customer) {
        const { data: newCustomer, error: insertError } = await supabaseClient
          .from('customer_accounts')
          .insert([{ mobile: cleanMobile }])
          .select()
          .single()
        if (insertError) throw insertError
        customer = newCustomer
      }

      return new Response(JSON.stringify({ 
        success: true, 
        user: customer 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response('Invalid Action', { status: 400 })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
