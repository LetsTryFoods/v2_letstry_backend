# Payment System API Documentation for Frontend

## Table of Contents
1. [Overview](#overview)
2. [Payment Flow](#payment-flow)
3. [GraphQL API Reference](#graphql-api-reference)
4. [Frontend Implementation Guide](#frontend-implementation-guide)
5. [Error Handling](#error-handling)
6. [Testing](#testing)

---

## Overview

This document describes the payment system integration using ZaakPay payment gateway. The system supports:
- Card payments (Credit/Debit)
- Net Banking
- UPI
- Wallets
- Full and partial refunds
- Order management

**Base URL:** `https://api.yourapp.com/graphql`

---

## Payment Flow

### Complete User Journey

```
┌─────────────┐
│   User      │
│   Cart      │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Checkout Page      │
│  Click "Pay Now"    │
└──────┬──────────────┘
       │
       │ 1. Call initiatePayment mutation
       ▼
┌─────────────────────┐
│   Your Backend      │
│   Creates Payment   │
│   Returns Form Data │
└──────┬──────────────┘
       │
       │ 2. Auto-submit form
       ▼
┌─────────────────────┐
│   ZaakPay Page      │
│   User Enters Card  │
└──────┬──────────────┘
       │
       │ 3a. Browser Redirect
       ▼
┌─────────────────────┐      3b. Webhook (Server-to-Server)
│  Callback Page      │◄─────────────────┐
│  /payment/callback  │                  │
└──────┬──────────────┘                  │
       │                          ┌──────┴──────┐
       │ 4. Poll for status       │  ZaakPay    │
       ▼                          │  Webhook    │
┌─────────────────────┐          │  to Backend │
│  Check Payment      │          └─────────────┘
│  Status API         │
└──────┬──────────────┘
       │
       │ 5. Status SUCCESS
       ▼
┌─────────────────────┐
│  Order Created      │
│  Show Confirmation  │
└─────────────────────┘
```

---

## GraphQL API Reference

### 1. Initiate Payment

**Purpose:** Start a new payment transaction and get ZaakPay checkout URL.

**Mutation:**
```graphql
mutation InitiatePayment($input: InitiatePaymentInput!) {
  initiatePayment(input: $input) {
    paymentOrderId
    checkoutUrl
    checksumData
  }
}
```

**Input:**
```typescript
{
  cartId: string          // Your cart ID
  amount: string          // Amount in rupees (e.g., "1500.00")
  currency: string        // Always "INR"
  returnUrl?: string      // Optional: Override default return URL
}
```

**Response:**
```typescript
{
  paymentOrderId: string      // Unique payment order ID (use for tracking)
  checkoutUrl: string         // ZaakPay URL to redirect to
  checksumData: {
    amount: string
    merchantIdentifier: string
    orderId: string
    returnUrl: string
    buyerEmail: string
    buyerFirstName: string
    buyerPhoneNumber: string
    currency: string
    txnType: string
    zpPayOption: string
    mode: string
    productDescription: string
    txnDate: string
    checksum: string
    // ... all fields needed for form submission
  }
}
```

**Example:**
```typescript
const { data } = await client.mutate({
  mutation: INITIATE_PAYMENT,
  variables: {
    input: {
      cartId: "cart_123",
      amount: "1500.00",
      currency: "INR",
      returnUrl: "https://yourwebsite.com/payment/callback"
    }
  }
});

console.log(data.initiatePayment.paymentOrderId); // "PAY_1234567890"
```

---

### 2. Check Payment Status

**Purpose:** Verify payment status after user returns from ZaakPay.

**Query:**
```graphql
query GetPaymentStatus($paymentOrderId: String!) {
  getPaymentStatus(paymentOrderId: $paymentOrderId) {
    paymentOrderId
    status
    message
    paymentOrder {
      paymentOrderId
      amount
      currency
      paymentOrderStatus
      paymentMethod
      completedAt
      createdAt
    }
  }
}
```

**Input:**
```typescript
{
  paymentOrderId: string  // Payment order ID from initiatePayment
}
```

**Response:**
```typescript
{
  paymentOrderId: string
  status: "SUCCESS" | "FAILED" | "PENDING" | "NOT_STARTED"
  message?: string
  paymentOrder: {
    paymentOrderId: string
    amount: string
    currency: string
    paymentOrderStatus: PaymentStatus
    paymentMethod?: string
    completedAt?: Date
    createdAt: Date
  }
}
```

**Example:**
```typescript
const { data } = await client.query({
  query: GET_PAYMENT_STATUS,
  variables: {
    paymentOrderId: "PAY_1234567890"
  }
});

if (data.getPaymentStatus.status === "SUCCESS") {
  // Redirect to order page
  router.push(`/order/${data.getPaymentStatus.paymentOrder.orderId}`);
}
```

---

### 3. Get My Orders

**Purpose:** Fetch list of orders for the logged-in user.

**Query:**
```graphql
query GetMyOrders($input: GetMyOrdersInput!) {
  getMyOrders(input: $input) {
    orders {
      _id
      orderId
      totalAmount
      currency
      orderStatus
      items {
        productId
        name
        sku
        quantity
        price
        totalPrice
      }
      shippingAddressId
      trackingNumber
      deliveredAt
      cancelledAt
      createdAt
      updatedAt
    }
    total
    page
    limit
    totalPages
  }
}
```

**Input:**
```typescript
{
  page?: number        // Default: 1
  limit?: number       // Default: 10
  status?: OrderStatus // Optional filter
}
```

**Response:**
```typescript
{
  orders: Array<{
    _id: string
    orderId: string
    totalAmount: string
    currency: string
    orderStatus: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
    items: Array<{
      productId: string
      name: string
      sku: string
      quantity: number
      price: string
      totalPrice: string
    }>
    shippingAddressId?: string
    trackingNumber?: string
    deliveredAt?: Date
    cancelledAt?: Date
    createdAt: Date
    updatedAt: Date
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}
```

**Example:**
```typescript
const { data } = await client.query({
  query: GET_MY_ORDERS,
  variables: {
    input: {
      page: 1,
      limit: 10,
      status: "DELIVERED" // Optional
    }
  }
});

console.log(`Total Orders: ${data.getMyOrders.total}`);
```

---

### 4. Get Order by ID

**Purpose:** Fetch specific order details.

**Query:**
```graphql
query GetOrderById($orderId: String!) {
  getOrderById(orderId: $orderId) {
    _id
    orderId
    totalAmount
    currency
    orderStatus
    items {
      productId
      name
      sku
      quantity
      price
      totalPrice
    }
    shippingAddressId
    trackingNumber
    deliveredAt
    cancelledAt
    createdAt
    updatedAt
  }
}
```

**Input:**
```typescript
{
  orderId: string  // Order ID (e.g., "ORD_1234567890")
}
```

**Example:**
```typescript
const { data } = await client.query({
  query: GET_ORDER_BY_ID,
  variables: {
    orderId: "ORD_1234567890"
  }
});
```

---

### 5. Cancel Order

**Purpose:** Cancel an order (only if not delivered/cancelled).

**Mutation:**
```graphql
mutation CancelOrder($input: CancelOrderInput!) {
  cancelOrder(input: $input) {
    orderId
    orderStatus
    cancellationReason
    cancelledAt
  }
}
```

**Input:**
```typescript
{
  orderId: string   // Order ID to cancel
  reason?: string   // Optional cancellation reason
}
```

**Example:**
```typescript
const { data } = await client.mutate({
  mutation: CANCEL_ORDER,
  variables: {
    input: {
      orderId: "ORD_1234567890",
      reason: "Changed my mind"
    }
  }
});
```

---

### 6. Request Refund

**Purpose:** Request a refund for a successful payment.

**Mutation:**
```graphql
mutation ProcessRefund($input: ProcessRefundInput!) {
  processRefund(input: $input) {
    refundId
    status
    message
  }
}
```

**Input:**
```typescript
{
  paymentOrderId: string  // Payment order ID
  refundAmount: string    // Amount to refund (for partial refund)
  reason?: string         // Optional refund reason
}
```

**Response:**
```typescript
{
  refundId: string
  status: "SUCCESS" | "FAILED" | "PENDING"
  message?: string
}
```

**Example:**
```typescript
// Full refund
const { data } = await client.mutate({
  mutation: PROCESS_REFUND,
  variables: {
    input: {
      paymentOrderId: "PAY_1234567890",
      refundAmount: "1500.00",
      reason: "Product damaged"
    }
  }
});

// Partial refund
const { data } = await client.mutate({
  mutation: PROCESS_REFUND,
  variables: {
    input: {
      paymentOrderId: "PAY_1234567890",
      refundAmount: "500.00",  // Partial amount
      reason: "Partial refund for one item"
    }
  }
});
```

---

## Frontend Implementation Guide

### Step 1: Checkout Page Implementation

```tsx
// pages/checkout.tsx
import { useMutation } from '@apollo/client';
import { INITIATE_PAYMENT } from '../graphql/mutations';

export default function CheckoutPage() {
  const [initiatePayment, { loading }] = useMutation(INITIATE_PAYMENT);
  
  const handlePayment = async () => {
    try {
      const { data } = await initiatePayment({
        variables: {
          input: {
            cartId: "cart_123",
            amount: "1500.00",
            currency: "INR",
            returnUrl: `${window.location.origin}/payment/callback`
          }
        }
      });
      
      // Create form and auto-submit to ZaakPay
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.initiatePayment.checkoutUrl;
      
      // Add all checksum data as hidden fields
      Object.entries(data.initiatePayment.checksumData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });
      
      document.body.appendChild(form);
      form.submit();
      
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Failed to initiate payment');
    }
  };
  
  return (
    <div>
      <h1>Checkout</h1>
      <button 
        onClick={handlePayment} 
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </div>
  );
}
```

---

### Step 2: Payment Callback Page

```tsx
// pages/payment/callback.tsx
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { GET_PAYMENT_STATUS } from '../graphql/queries';
import { useEffect, useState } from 'react';

export default function PaymentCallback() {
  const router = useRouter();
  const { orderId, responseCode } = router.query;
  const [pollingInterval, setPollingInterval] = useState(2000);
  
  const { data, startPolling, stopPolling } = useQuery(GET_PAYMENT_STATUS, {
    variables: { paymentOrderId: orderId },
    skip: !orderId,
    pollInterval: pollingInterval,
  });
  
  useEffect(() => {
    if (!orderId) return;
    
    // Start polling
    startPolling(2000);
    
    return () => stopPolling();
  }, [orderId]);
  
  useEffect(() => {
    if (!data) return;
    
    const status = data.getPaymentStatus.status;
    
    if (status === 'SUCCESS') {
      stopPolling();
      // Redirect to order confirmation
      setTimeout(() => {
        router.push(`/order/${data.getPaymentStatus.paymentOrder.orderId}`);
      }, 2000);
    } else if (status === 'FAILED') {
      stopPolling();
      // Show error
    }
    // Keep polling if PENDING
  }, [data]);
  
  if (!data) {
    return (
      <div className="loading">
        <h2>Verifying your payment...</h2>
        <p>Please wait while we confirm your transaction.</p>
      </div>
    );
  }
  
  if (data.getPaymentStatus.status === 'SUCCESS') {
    return (
      <div className="success">
        <h2>✓ Payment Successful!</h2>
        <p>Redirecting to your order...</p>
      </div>
    );
  }
  
  if (data.getPaymentStatus.status === 'FAILED') {
    return (
      <div className="error">
        <h2>✗ Payment Failed</h2>
        <p>{data.getPaymentStatus.message}</p>
        <button onClick={() => router.push('/cart')}>
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="pending">
      <h2>Processing...</h2>
      <p>Your payment is being processed. Please wait.</p>
    </div>
  );
}
```

---

### Step 3: Orders List Page

```tsx
// pages/orders.tsx
import { useQuery } from '@apollo/client';
import { GET_MY_ORDERS } from '../graphql/queries';

export default function OrdersPage() {
  const { data, loading, fetchMore } = useQuery(GET_MY_ORDERS, {
    variables: {
      input: {
        page: 1,
        limit: 10
      }
    }
  });
  
  if (loading) return <div>Loading orders...</div>;
  
  return (
    <div>
      <h1>My Orders</h1>
      <div className="orders-list">
        {data.getMyOrders.orders.map((order) => (
          <div key={order.orderId} className="order-card">
            <h3>Order #{order.orderId}</h3>
            <p>Amount: ₹{order.totalAmount}</p>
            <p>Status: {order.orderStatus}</p>
            <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            <button onClick={() => router.push(`/order/${order.orderId}`)}>
              View Details
            </button>
          </div>
        ))}
      </div>
      
      {data.getMyOrders.page < data.getMyOrders.totalPages && (
        <button onClick={() => {
          fetchMore({
            variables: {
              input: {
                page: data.getMyOrders.page + 1,
                limit: 10
              }
            }
          });
        }}>
          Load More
        </button>
      )}
    </div>
  );
}
```

---

### Step 4: GraphQL Mutations & Queries

```typescript
// graphql/mutations.ts
import { gql } from '@apollo/client';

export const INITIATE_PAYMENT = gql`
  mutation InitiatePayment($input: InitiatePaymentInput!) {
    initiatePayment(input: $input) {
      paymentOrderId
      checkoutUrl
      checksumData
    }
  }
`;

export const PROCESS_REFUND = gql`
  mutation ProcessRefund($input: ProcessRefundInput!) {
    processRefund(input: $input) {
      refundId
      status
      message
    }
  }
`;

export const CANCEL_ORDER = gql`
  mutation CancelOrder($input: CancelOrderInput!) {
    cancelOrder(input: $input) {
      orderId
      orderStatus
      cancellationReason
      cancelledAt
    }
  }
`;
```

```typescript
// graphql/queries.ts
import { gql } from '@apollo/client';

export const GET_PAYMENT_STATUS = gql`
  query GetPaymentStatus($paymentOrderId: String!) {
    getPaymentStatus(paymentOrderId: $paymentOrderId) {
      paymentOrderId
      status
      message
      paymentOrder {
        paymentOrderId
        amount
        currency
        paymentOrderStatus
        paymentMethod
        completedAt
        createdAt
      }
    }
  }
`;

export const GET_MY_ORDERS = gql`
  query GetMyOrders($input: GetMyOrdersInput!) {
    getMyOrders(input: $input) {
      orders {
        _id
        orderId
        totalAmount
        currency
        orderStatus
        items {
          productId
          name
          sku
          quantity
          price
          totalPrice
        }
        trackingNumber
        createdAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;

export const GET_ORDER_BY_ID = gql`
  query GetOrderById($orderId: String!) {
    getOrderById(orderId: $orderId) {
      _id
      orderId
      totalAmount
      currency
      orderStatus
      items {
        productId
        name
        sku
        quantity
        price
        totalPrice
      }
      shippingAddressId
      trackingNumber
      deliveredAt
      cancelledAt
      createdAt
      updatedAt
    }
  }
`;
```

---

## Error Handling

### Common Error Codes

| Error Code | Description | Action |
|------------|-------------|--------|
| `PAYMENT_NOT_FOUND` | Payment order doesn't exist | Redirect to cart |
| `INVALID_AMOUNT` | Amount validation failed | Show error, retry |
| `PAYMENT_ALREADY_PROCESSED` | Duplicate payment attempt | Show existing order |
| `ORDER_NOT_FOUND` | Order doesn't exist | Redirect to orders list |
| `REFUND_FAILED` | Refund initiation failed | Show error, contact support |
| `INVALID_STATUS_TRANSITION` | Can't cancel delivered order | Show appropriate message |

### Error Handling Example

```typescript
try {
  const { data } = await initiatePayment({ variables: { input } });
} catch (error) {
  if (error.message.includes('PAYMENT_ALREADY_PROCESSED')) {
    alert('This order has already been processed');
    router.push('/orders');
  } else if (error.message.includes('INVALID_AMOUNT')) {
    alert('Invalid payment amount. Please refresh and try again.');
  } else {
    alert('Payment initiation failed. Please try again.');
  }
}
```

---

## Testing

### Test Card Numbers (Staging/Sandbox)

| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4012001037141112 | 123 | Any future date | SUCCESS |
| 5123456789012346 | 123 | Any future date | FAILED |

### Test Flow Checklist

- [ ] Initiate payment successfully
- [ ] Redirect to ZaakPay page
- [ ] Complete payment with test card
- [ ] Return to callback page
- [ ] Verify payment status polling
- [ ] View order confirmation
- [ ] List orders on orders page
- [ ] View single order details
- [ ] Cancel order
- [ ] Request refund

---

## Important Notes

### ⚠️ Security

1. **Never trust returnUrl parameters** - Always verify payment status with backend
2. **Don't expose sensitive data** - Payment details are handled by ZaakPay
3. **Use HTTPS** - All payment-related pages must use HTTPS

### ⏱️ Polling Strategy

- Poll every **2 seconds** for payment status
- Maximum **30 polls** (60 seconds total)
- After timeout, show "Contact Support" message

### 📱 Mobile Considerations

- Ensure form submission works on mobile browsers
- Test redirect flow on iOS Safari and Chrome
- Handle app switching gracefully

### 🔄 Idempotency

- Same `paymentOrderId` can be checked multiple times
- Duplicate webhooks are handled automatically
- Safe to retry failed operations

---

## Support

For any integration issues, contact:
- **Backend Team:** backend@yourcompany.com
- **DevOps:** devops@yourcompany.com

---

**Last Updated:** December 16, 2025
**API Version:** v1
