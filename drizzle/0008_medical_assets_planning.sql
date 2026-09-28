ALTER TABLE `categories` ADD `asset_type` text DEFAULT 'تقني' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assets` ADD `asset_type` text DEFAULT 'تقني' NOT NULL;
--> statement-breakpoint
CREATE TABLE `asset_plans` (
 `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `facility_id` integer NOT NULL,
 `department_id` integer NOT NULL,
 `category_id` integer NOT NULL,
 `product_id` integer NOT NULL,
 `required_quantity` integer DEFAULT 0 NOT NULL,
 `notes` text DEFAULT '' NOT NULL,
 `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
 FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`),
 FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`),
 FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
 FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_plans_scope_unique` ON `asset_plans` (`facility_id`,`department_id`,`product_id`);
