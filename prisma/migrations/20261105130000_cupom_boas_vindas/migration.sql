-- Cupom de boas-vindas: primeira compra pelo site, período do cadastro e prazo para usar.
ALTER TABLE `cupons`
  ADD COLUMN `so_primeira_compra` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `cadastro_desde` DATETIME(3) NULL,
  ADD COLUMN `cadastro_ate` DATETIME(3) NULL,
  ADD COLUMN `dias_para_usar` INTEGER NULL;
