/**
 * x402 Betting API Route
 * Handles HTTP 402 Payment Required flow for gasless betting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFacilitator } from '@/services/x402Facilitator';
import type { PaymentPayload, PaymentRequiredResponse } from '@/services/x402Client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = parseInt(params.id);
    const body = await request.json();
    const { position, amount } = body;

    // Check for PAYMENT-SIGNATURE header
    const paymentSignature = request.headers.get('PAYMENT-SIGNATURE');

    if (!paymentSignature) {
      // Step 1: Return 402 Payment Required
      const facilitator = getFacilitator();
      const paymentRequirements = facilitator.getPaymentRequirements(
        marketId,
        BigInt(amount),
        `/api/markets/${marketId}/bet`
      );

      const paymentRequired: PaymentRequiredResponse = {
        x402Version: 2,
        error: 'Payment required',
        resource: {
          url: `/api/markets/${marketId}/bet`,
          description: `Place bet on market #${marketId}`,
          mimeType: 'application/json',
        },
        accepts: [paymentRequirements],
      };

      // Encode as base64 header
      const encodedPaymentRequired = Buffer.from(
        JSON.stringify(paymentRequired)
      ).toString('base64');

      return new NextResponse(
        JSON.stringify({ error: 'Payment required' }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'PAYMENT-REQUIRED': encodedPaymentRequired,
          },
        }
      );
    }

    // Step 2: Process payment with signature
    console.log('[X402] Processing payment with signature...');
    
    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = JSON.parse(
        Buffer.from(paymentSignature, 'base64').toString('utf-8')
      );
    } catch (parseError) {
      console.error('[X402] Failed to parse payment signature:', parseError);
      return NextResponse.json(
        { error: 'Invalid payment signature format' },
        { status: 400 }
      );
    }

    const facilitator = getFacilitator();
    const paymentRequirements = facilitator.getPaymentRequirements(
      marketId,
      BigInt(amount),
      `/api/markets/${marketId}/bet`
    );

    console.log('[X402] Settling payment for market', marketId, 'position', position);
    
    // Settle payment (facilitator executes on-chain)
    const settlement = await facilitator.settlePayment(
      {
        paymentPayload,
        paymentRequirements,
      },
      marketId,
      position
    );

    console.log('[X402] Settlement result:', settlement);

    if (!settlement.success) {
      // Return 500 for server-side errors, not 402 (which would trigger payment flow again)
      return NextResponse.json(
        {
          error: settlement.errorReason || 'Payment settlement failed',
          details: 'The facilitator could not execute the transaction. Check server logs.',
        },
        { status: 500 }
      );
    }

    // Encode settlement response
    const encodedSettlement = Buffer.from(
      JSON.stringify(settlement)
    ).toString('base64');

    return NextResponse.json(
      {
        success: true,
        transactionHash: settlement.transaction,
        payer: settlement.payer,
      },
      {
        status: 200,
        headers: {
          'PAYMENT-RESPONSE': encodedSettlement,
        },
      }
    );
  } catch (error) {
    console.error('x402 betting error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
