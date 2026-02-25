USE gestion_empresarial;

ALTER TABLE ordenes_compra
ADD COLUMN usuario_creador_id INT NULL;
