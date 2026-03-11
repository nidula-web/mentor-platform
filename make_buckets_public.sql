-- Execute this in the Supabase Dashboard SQL Editor
-- This will make the chat-images and voice-messages buckets public
-- so that getPublicUrl() works correctly without throwing an error

UPDATE storage.buckets
SET public = true
WHERE id IN ('chat-images', 'voice-messages');
