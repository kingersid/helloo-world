import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from "https://esm.sh/razorpay@2.8.6"

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

    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID'),
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
    })

    const { action, payload } = await req.json()

    // --- ACTION: CREATE ORDER ---
    if (action === 'create-order') {
      const { amount } = payload
      const options = {
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      }
      const order = await razorpay.orders.create(options)
      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- ACTION: VERIFY PAYMENT ---
    if (action === 'verify-payment') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = payload
      
      // Signature Verification logic
      const body = razorpay_order_id + "|" + razorpay_payment_id
      // In Deno, we use Web Crypto API for HMAC
      const secret = Deno.env.get('RAZORPAY_KEY_SECRET') || ''
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" },
        false, ["sign"]
      )
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
      const generated_signature = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      if (generated_signature !== razorpay_signature) {
        throw new Error('Invalid signature')
      }

      // Save to Supabase
      const { data: order, error: orderError } = await supabaseClient
        .from('ecommerce_orders')
        .insert([{
          customer_name: orderData.customer_name,
          customer_mobile: orderData.customer_mobile,
          address: orderData.address,
          total_amount: orderData.total_amount,
          status: 'Paid',
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          payment_method: 'Online'
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Save order items
      const itemsToInsert = orderData.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }))
      
      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // --- MSG91 SMS (Optional) ---
      const msg91Key = Deno.env.get('MSG91_AUTH_KEY')
      const templateId = Deno.env.get('MSG91_ORDER_TEMPLATE_ID')
      if (msg91Key && templateId) {
        let mobile = orderData.customer_mobile.replace(/\D/g, '')
        if (mobile.length === 10) mobile = '91' + mobile
        
        fetch('https://control.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: { 'authkey': msg91Key, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: templateId,
            mobile: mobile,
            name: orderData.customer_name,
            order_id: order.id.toString(),
            amount: orderData.total_amount.toString()
          })
        }).catch(err => console.error('SMS Error:', err))
      }

      return new Response(JSON.stringify({ success: true, orderId: order.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Invalid Action', { status: 400 })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
