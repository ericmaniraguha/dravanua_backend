-- DRA VANUA GROUP LTD
-- Database Migration: Add Audit Fields to Asset Management Module
-- Description: Adds recorded_by and modified_by columns to assets, asset_maintenance, and asset_transfers.

-- 1. Update 'assets' table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS recorded_by CHAR(36) NULL,
ADD COLUMN IF NOT EXISTS modified_by CHAR(36) NULL;

-- Add Foreign Key Constraints for 'assets'
ALTER TABLE assets
ADD CONSTRAINT fk_assets_recorded_by FOREIGN KEY (recorded_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_assets_modified_by FOREIGN KEY (modified_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL;


-- 2. Update 'asset_maintenance' table
ALTER TABLE asset_maintenance 
ADD COLUMN IF NOT EXISTS recorded_by CHAR(36) NULL,
ADD COLUMN IF NOT EXISTS modified_by CHAR(36) NULL;

-- Add Foreign Key Constraints for 'asset_maintenance'
ALTER TABLE asset_maintenance
ADD CONSTRAINT fk_maint_recorded_by FOREIGN KEY (recorded_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_maint_modified_by FOREIGN KEY (modified_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL;


-- 3. Update 'asset_transfers' table
ALTER TABLE asset_transfers 
ADD COLUMN IF NOT EXISTS recorded_by CHAR(36) NULL,
ADD COLUMN IF NOT EXISTS modified_by CHAR(36) NULL;

-- Add Foreign Key Constraints for 'asset_transfers'
ALTER TABLE asset_transfers
ADD CONSTRAINT fk_transfers_recorded_by FOREIGN KEY (recorded_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_transfers_modified_by FOREIGN KEY (modified_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL;

-- Verify columns
DESCRIBE assets;
DESCRIBE asset_maintenance;
DESCRIBE asset_transfers;
