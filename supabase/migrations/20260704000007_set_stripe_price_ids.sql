-- Wire up real Stripe price IDs for paid plans.

update plans set
  stripe_price_id = 'price_1TpNCrDERPnt0s7ZaKhh9LY3',
  stripe_price_id_yearly = 'price_1TpNQbDERPnt0s7Z7kpGUIry'
where slug = 'pro';

update plans set
  stripe_price_id = 'price_1TpNEzDERPnt0s7Z6QIuoIsg',
  stripe_price_id_yearly = 'price_1TpNSODERPnt0s7ZcnwJMhYD'
where slug = 'pro_plus';

update plans set
  stripe_price_id = 'price_1TpNGpDERPnt0s7ZQD31U2Gv',
  stripe_price_id_yearly = 'price_1TpNTUDERPnt0s7ZxZiIeL1I'
where slug = 'enterprise';
