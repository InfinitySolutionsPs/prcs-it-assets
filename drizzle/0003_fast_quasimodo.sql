CREATE TABLE `asset_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`asset_code` text NOT NULL,
	`asset_name` text NOT NULL,
	`movement_type` text NOT NULL,
	`from_facility` text DEFAULT '' NOT NULL,
	`from_department` text DEFAULT '' NOT NULL,
	`from_responsible` text DEFAULT '' NOT NULL,
	`to_facility` text NOT NULL,
	`to_department` text NOT NULL,
	`to_responsible` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`movement_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
