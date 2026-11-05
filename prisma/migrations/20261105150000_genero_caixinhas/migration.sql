-- Gênero em caixinhas: a peça unissex continua aparecendo no filtro Unissex.
ALTER TABLE `pecas` ADD COLUMN `unissex` BOOLEAN NOT NULL DEFAULT false;
UPDATE `pecas` SET `unissex` = true WHERE `genero` = 'unissex';
