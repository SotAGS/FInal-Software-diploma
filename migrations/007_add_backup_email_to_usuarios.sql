USE gestion_empresarial;

SET @col_exists = (
	SELECT COUNT(*)
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
	  AND TABLE_NAME = 'usuarios'
	  AND COLUMN_NAME = 'backup_email'
);

SET @ddl = IF(
	@col_exists = 0,
	'ALTER TABLE usuarios ADD COLUMN backup_email VARCHAR(100) NULL',
	'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
