-- Mensagens da lista "Enviar hoje" já mandadas, para não aparecerem de novo.
CREATE TABLE `mensagens_enviadas` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `referencia` VARCHAR(191) NOT NULL,
    `quem` VARCHAR(120) NOT NULL,
    `enviada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mensagens_enviadas_tipo_referencia_key`(`tipo`, `referencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
