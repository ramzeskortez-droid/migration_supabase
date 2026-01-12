ALTER TABLE incoming_emails ADD COLUMN locked_by uuid REFERENCES app_users(id);
ALTER TABLE incoming_emails ADD COLUMN locked_at timestamptz;

COMMENT ON COLUMN incoming_emails.locked_by IS 'ID оператора, который взял письмо в работу';
COMMENT ON COLUMN incoming_emails.locked_at IS 'Время взятия в работу (для таймаутов)';