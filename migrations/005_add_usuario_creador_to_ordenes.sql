USE gestion_empresarial;

SET @col_exists = (
	SELECT COUNT(*)
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
	  AND TABLE_NAME = 'ordenes_compra'
	  AND COLUMN_NAME = 'usuario_creador_id'
);

SET @ddl = IF(
	@col_exists = 0,
	'ALTER TABLE ordenes_compra ADD COLUMN usuario_creador_id INT NULL',
	'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
