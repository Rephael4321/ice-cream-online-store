-- Client payments: record payments against client debt (amount + method).
-- Total debt = (sum unpaid orders + manual_debt_adjustment) - sum(client_payments.amount)
CREATE TABLE IF NOT EXISTS client_payments (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit', 'paybox', 'cash')),
  created_at TIMESTAMPTZ DEFAULT now(),
  recorded_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
