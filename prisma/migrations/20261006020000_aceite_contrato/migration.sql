-- AlterTable
ALTER TABLE `candidaturas` ADD COLUMN `documento` VARCHAR(30) NULL,
    ADD COLUMN `pix` VARCHAR(191) NULL,
    ADD COLUMN `pix_tipo` ENUM('cpf', 'telefone', 'email', 'aleatoria') NULL,
    ADD COLUMN `recebimento_preferido` ENUM('pix', 'credito') NULL;

-- AlterTable
ALTER TABLE `fornecedoras` ADD COLUMN `pix_tipo` ENUM('cpf', 'telefone', 'email', 'aleatoria') NULL,
    ADD COLUMN `recebimento_preferido` ENUM('pix', 'credito') NULL;

-- CreateTable
CREATE TABLE `aceites_contrato` (
    `id` VARCHAR(191) NOT NULL,
    `fornecedora_id` VARCHAR(191) NULL,
    `candidatura_id` VARCHAR(191) NULL,
    `usuario_id` VARCHAR(191) NULL,
    `versao` VARCHAR(20) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `texto` MEDIUMTEXT NOT NULL,
    `hash` CHAR(64) NOT NULL,
    `aberto_em` DATETIME(3) NOT NULL,
    `lido_ate_o_fim_em` DATETIME(3) NULL,
    `aceito_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(64) NULL,
    `navegador` VARCHAR(255) NULL,
    `nome` VARCHAR(160) NOT NULL,
    `documento` VARCHAR(30) NOT NULL,
    `telefone` VARCHAR(40) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `pix` VARCHAR(191) NULL,
    `pix_tipo` ENUM('cpf', 'telefone', 'email', 'aleatoria') NULL,
    `recebimento_preferido` ENUM('pix', 'credito') NOT NULL,

    INDEX `aceites_contrato_fornecedora_id_idx`(`fornecedora_id`),
    INDEX `aceites_contrato_candidatura_id_idx`(`candidatura_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `aceites_contrato` ADD CONSTRAINT `aceites_contrato_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aceites_contrato` ADD CONSTRAINT `aceites_contrato_candidatura_id_fkey` FOREIGN KEY (`candidatura_id`) REFERENCES `candidaturas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

