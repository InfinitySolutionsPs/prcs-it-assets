CREATE TABLE `inventory_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`asset_code` text NOT NULL,
	`asset_name` text NOT NULL,
	`facility` text NOT NULL,
	`department` text NOT NULL,
	`result` text NOT NULL,
	`checked_by` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`checked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maintenance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`asset_code` text NOT NULL,
	`asset_name` text NOT NULL,
	`issue` text NOT NULL,
	`technician` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'مفتوح' NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product` text NOT NULL,
	`category` text NOT NULL,
	`transaction_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`facility` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
