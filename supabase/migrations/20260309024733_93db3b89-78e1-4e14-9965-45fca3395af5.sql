
-- Delete all business data for test user business
DELETE FROM customer_ledger WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM returns WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM sales WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM purchase_transactions WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM exchanges WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM partner_transfers WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM capital_contributions WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM expenses WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM sample_orders WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM activity_log WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM notifications WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM customers WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM inventory_items WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM partners WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM business_members WHERE business_id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM notifications WHERE user_id = 'de7d68a9-1df6-4b4f-9157-31449fb446fe';
DELETE FROM profiles WHERE user_id = 'de7d68a9-1df6-4b4f-9157-31449fb446fe';
DELETE FROM businesses WHERE id = '5caf5744-34bd-48f6-bebc-927f421c0bb3';
DELETE FROM auth.users WHERE id = 'de7d68a9-1df6-4b4f-9157-31449fb446fe';
