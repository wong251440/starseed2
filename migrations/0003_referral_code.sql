ALTER TABLE attempts ADD COLUMN referral_code TEXT;
CREATE INDEX attempts_referral_code ON attempts(referral_code, received_at);
