ALTER TABLE `stock_transactions` ADD `product_id` integer REFERENCES `products`(`id`) ON DELETE set null;
--> statement-breakpoint
UPDATE `stock_transactions`
SET `product_id` = (
	SELECT `products`.`id`
	FROM `products`
	INNER JOIN `categories` ON `categories`.`id` = `products`.`parent_id`
	WHERE `products`.`name` = `stock_transactions`.`product`
		AND `categories`.`name` = `stock_transactions`.`category`
	ORDER BY `products`.`id`
	LIMIT 1
)
WHERE `product_id` IS NULL
	AND 1 = (
		SELECT COUNT(*)
		FROM `products`
		INNER JOIN `categories` ON `categories`.`id` = `products`.`parent_id`
		WHERE `products`.`name` = `stock_transactions`.`product`
			AND `categories`.`name` = `stock_transactions`.`category`
	);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transactions_import_reference_unique`
	ON `stock_transactions` (`reference`)
	WHERE `reference` LIKE 'IMPORT:%';
