-- CreateTable
CREATE TABLE `configuracao_loja` (
    `id` INTEGER NOT NULL,
    `nome` VARCHAR(80) NOT NULL,
    `nome_curto` VARCHAR(40) NOT NULL,
    `slogan` VARCHAR(120) NULL,
    `descricao` VARCHAR(160) NULL,
    `whatsapp` VARCHAR(20) NOT NULL,
    `instagram` VARCHAR(60) NULL,
    `cor_destaque` VARCHAR(7) NOT NULL,
    `cor_principal` VARCHAR(7) NOT NULL,
    `cor_texto` VARCHAR(7) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `icone` VARCHAR(191) NULL,
    `prefixo_loja` VARCHAR(4) NOT NULL,
    `repasse_padrao` INTEGER NOT NULL,
    `minutos_reserva` INTEGER NOT NULL,
    `meses_devolucao` INTEGER NOT NULL,
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dados da Salty Baby (outra loja troca tudo em /painel/configuracoes).
INSERT INTO `configuracao_loja`
  (`id`, `nome`, `nome_curto`, `slogan`, `descricao`, `whatsapp`, `instagram`, `cor_destaque`, `cor_principal`, `cor_texto`,
   `prefixo_loja`, `repasse_padrao`, `minutos_reserva`, `meses_devolucao`, `atualizado_em`)
VALUES
  (1, 'Salty Baby', 'Salty', 'Moda Sustentável', 'Brechó infantil em Caraguatatuba-SP', '5512981053623', NULL, '#32AFB5', '#13506E', '#13212B',
   'SB', 4000, 15, 6, CURRENT_TIMESTAMP(3));
