-- Manual migration to remove authorized_by column from cxc table
ALTER TABLE cxc DROP COLUMN IF EXISTS authorized_by;
