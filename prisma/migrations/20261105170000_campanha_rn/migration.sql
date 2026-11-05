-- Campanha de lançamento, indicação de amigas e LGPD (aceita mensagens).
ALTER TABLE `clientes`
  ADD COLUMN `aceita_mensagens` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `mensagens_alterado_em` DATETIME(3) NULL,
  ADD COLUMN `codigo_indicacao` VARCHAR(12) NULL,
  ADD COLUMN `indicada_por_id` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `clientes_codigo_indicacao_key` ON `clientes`(`codigo_indicacao`);
CREATE INDEX `clientes_indicada_por_id_idx` ON `clientes`(`indicada_por_id`);

ALTER TABLE `configuracao_loja`
  ADD COLUMN `video_como_comprar` VARCHAR(300) NULL,
  ADD COLUMN `mimo_indicacao` VARCHAR(160) NULL;

CREATE TABLE `campanhas` (
  `id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(80) NOT NULL,
  `codigo` VARCHAR(40) NOT NULL,
  `titulo` VARCHAR(120) NOT NULL,
  `texto` TEXT NULL,
  `tamanhos` VARCHAR(255) NOT NULL,
  `faixa` VARCHAR(160) NULL,
  `ate` DATETIME(3) NULL,
  `cupom` VARCHAR(30) NULL,
  `ativa` BOOLEAN NOT NULL DEFAULT true,
  `quem` VARCHAR(191) NOT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  UNIQUE INDEX `campanhas_codigo_key`(`codigo`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
