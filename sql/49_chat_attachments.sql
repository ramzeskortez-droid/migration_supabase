-- sql/49_chat_attachments.sql
-- Add file support to chat
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_type text; -- 'image' or 'file'
