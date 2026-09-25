const fs = require('fs');

let content = fs.readFileSync('backend/models/transactionModel.js', 'utf8');

// Patch 1: inside closeAuctionAndRecordWinner
const sellerCreditBlock1 = `            // Credit seller wallet
            const sellerWalletRes = await client.query(
                \`INSERT INTO wallets (user_id, balance)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id)
                 DO UPDATE SET balance = wallets.balance + $2
                 RETURNING wallet_id\`,
                [data.seller_id, winningAmount]
            );
            const sellerWalletId = sellerWalletRes.rows[0].wallet_id;

            // Log sale proceeds in seller's wallet ledger
            await client.query(
                \`INSERT INTO wallet_transactions (wallet_id, txn_id, type, amount)
                 VALUES ($1, $2, 'sale_proceeds', $3)\`,
                [sellerWalletId, transaction.txn_id, winningAmount]
            );`;

const escrowBlock1 = `            // Escrow: Funds are held. We no longer credit the seller instantly.
            // The seller will be credited when the buyer marks the shipment as 'delivered'.`;

content = content.replace(sellerCreditBlock1, escrowBlock1);

// Patch 2: inside processPayment
const sellerCreditBlock2 = `        // Credit seller wallet
        const sellerWalletRes = await client.query(
            \`
            INSERT INTO wallets (user_id, balance)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET balance = wallets.balance + $2
            RETURNING wallet_id, balance
            \`,
            [txn.seller_id, paymentAmount]
        );

        const sellerWallet = sellerWalletRes.rows[0];

        // Log seller transaction
        await client.query(
            \`
            INSERT INTO wallet_transactions (wallet_id, txn_id, payment_method_id, type, amount)
            VALUES ($1, $2, $3, 'sale_proceeds', $4)
            \`,
            [sellerWallet.wallet_id, txn.txn_id, paymentAmount]
        );`;

const escrowBlock2 = `        // Escrow: Funds are held by the platform.
        // The seller will be credited automatically upon delivery confirmation.`;

content = content.replace(sellerCreditBlock2, escrowBlock2);

fs.writeFileSync('backend/models/transactionModel.js', content);
console.log('patched');
