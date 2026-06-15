// Agora o sistema usa Supabase direto no frontend.
let confirmacaoPendente = null;
let frotaEmEdicao = null;
let graficoStatus = null;
let graficoDisponibilidadeGeral = null;
let graficoDisponibilidadeStatus = null;
let graficoDisponibilidadeTipos = null;
let graficosDisponibilidadeFrentes = [];
let confirmacaoMassa = null;
let confirmacaoHorarioAgente = null;

let equipamentosCarregados = [];
let historicoCarregado = [];
let filtroStatusAtual = "TODOS";
let abaAtual = "REBOQUES";

const ABAS_EQUIPAMENTOS = {
  REBOQUES: {
    rotulo: "Reboques",
    tituloGrafico: "Gráfico de Situação dos Reboques",
    tituloRelatorioTela: "Relatório de Reboques para WhatsApp",
    tituloRelatorio: "RELATÓRIO DE REBOQUES",
    descricao: "Acompanhando reboques cadastrados.",
    singular: "reboque",
    plural: "reboques",
    tipoPadrao: "Reboque",
    tipos: ["reboque", "reboques"]
  },
  FRENTES: {
    rotulo: "Frentes de Colheita",
    tituloGrafico: "Gráfico de Situação dos Equipamentos nas Frentes",
    tituloRelatorioTela: "Relatório dos Equipamentos das Frentes para WhatsApp",
    tituloRelatorio: "RELATÓRIO DOS EQUIPAMENTOS DAS FRENTES",
    descricao: "Acompanhando colhedoras e transbordos cadastrados dentro das frentes.",
    singular: "frente de colheita",
    plural: "frentes de colheita",
    tipoPadrao: "Frente de Colheita",
    tipos: ["frente", "frente de colheita", "frentes", "frentes de colheita"]
  },
  COLHEDORAS_TRANSBORDOS: {
    rotulo: "Colhedoras e Transbordos",
    tituloGrafico: "Gráfico de Situação das Colhedoras e Transbordos",
    tituloRelatorioTela: "Relatório de Colhedoras e Transbordos para WhatsApp",
    tituloRelatorio: "RELATÓRIO DE COLHEDORAS E TRANSBORDOS",
    descricao: "Acompanhando colhedoras e transbordos cadastrados.",
    singular: "equipamento",
    plural: "colhedoras e transbordos",
    tipoPadrao: "Colhedora",
    tipos: ["colhedora", "colhedoras", "transbordo", "transbordos"]
  },
  CAMINHOES_PROPRIOS: {
    rotulo: "Caminhões Próprios",
    tituloGrafico: "Gráfico de Situação dos Caminhões Próprios",
    tituloRelatorioTela: "Relatório de Caminhões Próprios para WhatsApp",
    tituloRelatorio: "RELATÓRIO DE CAMINHÕES PRÓPRIOS",
    descricao: "Acompanhando caminhões próprios cadastrados.",
    singular: "caminhão próprio",
    plural: "caminhões próprios",
    tipoPadrao: "Caminhão Próprio",
    tipos: ["caminhao", "caminhoes", "caminhao proprio", "caminhoes proprios", "caminhão", "caminhões", "caminhão próprio", "caminhões próprios"]
  },
  DISPONIBILIDADE: {
    rotulo: "Disponibilidade",
    tituloGrafico: "Disponibilidade do Dia",
    tituloRelatorioTela: "Relatório de Disponibilidade",
    tituloRelatorio: "RELATÓRIO DE DISPONIBILIDADE",
    descricao: "Acompanhando tempo parado e disponibilidade diária dos equipamentos.",
    singular: "equipamento",
    plural: "equipamentos",
    tipoPadrao: "Reboque",
    tipos: []
  },
  AGENTE: {
    rotulo: "Agente",
    tituloGrafico: "Agente de Atualização",
    tituloRelatorioTela: "Agente de Atualização",
    tituloRelatorio: "AGENTE DE ATUALIZAÇÃO",
    descricao: "Atualize qualquer equipamento do sistema por mensagem: reboques, colhedoras, transbordos e caminhões.",
    singular: "equipamento",
    plural: "equipamentos",
    tipoPadrao: "Reboque",
    tipos: []
  }
};

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compactarTexto(texto) {
  return normalizarTexto(texto).replace(/[^a-z0-9]/g, "");
}

function obterDataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterAgoraISO() {
  return new Date().toISOString();
}

function parseDataHora(valor) {
  if (!valor) {
    return null;
  }

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const texto = valor.toString().trim();
  const dataDireta = new Date(texto);

  if (!Number.isNaN(dataDireta.getTime())) {
    return dataDireta;
  }

  const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,)?\s*(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (match) {
    const [, dia, mes, ano, hora, minuto, segundo = "0"] = match;
    const dataPtBr = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo)
    );

    return Number.isNaN(dataPtBr.getTime()) ? null : dataPtBr;
  }

  return null;
}

function formatarDataHora(valor) {
  const data = parseDataHora(valor);

  if (!data) {
    return "-";
  }

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatarParaDatetimeLocal(valor) {
  const data = parseDataHora(valor);

  if (!data) {
    return "";
  }

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const minuto = String(data.getMinutes()).padStart(2, "0");

  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

function obterDataHoraInputComoISO(inputId) {
  const input = document.getElementById(inputId);

  if (!input || !input.value) {
    return "";
  }

  const [dataTexto, horaTexto = "00:00"] = input.value.split("T");
  const [ano, mes, dia] = dataTexto.split("-").map(Number);
  const [hora, minuto] = horaTexto.split(":").map(Number);
  const data = new Date(ano, mes - 1, dia, hora || 0, minuto || 0, 0, 0);

  return Number.isNaN(data.getTime()) ? "" : data.toISOString();
}

function obterDataParadoParaStatus(status, inputId, valorAtual = "") {
  if (status !== "PENDENTE") {
    return "";
  }

  return obterDataHoraInputComoISO(inputId) || valorAtual || obterAgoraISO();
}

function interpretarHorarioTexto(textoHorario) {
  const texto = (textoHorario || "").toString().trim().toLowerCase();
  const match = texto.match(/^(\d{1,2})(?::(\d{2})|h(\d{0,2}))?$/);

  if (!match) {
    return null;
  }

  const hora = Number(match[1]);
  const minuto = Number(match[2] || match[3] || 0);

  if (hora > 23 || minuto > 59) {
    return null;
  }

  return { hora, minuto };
}

function interpretarDataParadaTexto(textoData) {
  const hoje = new Date();
  const texto = normalizarTexto(textoData || "hoje");

  if (!texto || texto === "hoje") {
    return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  }

  if (texto === "ontem") {
    return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  }

  const dataISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dataISO) {
    const [, ano, mes, dia] = dataISO;
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  }

  const dataBR = texto.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);

  if (dataBR) {
    const [, dia, mes, anoTexto] = dataBR;
    const anoAtual = hoje.getFullYear();
    let ano = anoTexto ? Number(anoTexto) : anoAtual;

    if (ano < 100) {
      ano += 2000;
    }

    return new Date(ano, Number(mes) - 1, Number(dia));
  }

  return null;
}

function montarDataHoraLocal(dataBase, horario) {
  if (!dataBase || !horario) {
    return null;
  }

  const data = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate(),
    horario.hora,
    horario.minuto,
    0,
    0
  );

  return Number.isNaN(data.getTime()) ? null : data;
}

function extrairDataHoraParadaDaMensagem(mensagem) {
  const texto = (mensagem || "").toString();
  const gatilho = "(?:desde|parad[ao]\\s*(?:desde|em|a partir de|às|as)?|parou\\s*(?:desde|em|às|as)?|liberad[ao]\\s*(?:em|às|as)?|liberou\\s*(?:em|às|as)?|in[ií]cio\\s*(?:da\\s*parada)?\\s*(?:em|às|as)?|às|as)";
  const data = "(hoje|ontem|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|\\d{4}-\\d{2}-\\d{2})";
  const hora = "(\\d{1,2}(?::\\d{2}|h\\d{0,2})?)";
  const regex = new RegExp(`(?:^|\\s)${gatilho}\\s*(?:${data}\\s*)?(?:às|as)?\\s*${hora}`, "i");
  const match = texto.match(regex);

  if (!match) {
    return null;
  }

  const dataTexto = match[1] || "hoje";
  const horario = interpretarHorarioTexto(match[2]);
  const dataBase = interpretarDataParadaTexto(dataTexto);
  const dataHora = montarDataHoraLocal(dataBase, horario);

  if (!dataHora) {
    return null;
  }

  if (!match[1] && dataHora > new Date()) {
    dataHora.setDate(dataHora.getDate() - 1);
  }

  return {
    iso: dataHora.toISOString(),
    textoEncontrado: match[0].trim()
  };
}

function limparTrechoDataParada(texto, trecho) {
  if (!trecho) {
    return texto;
  }

  return (texto || "")
    .replace(trecho, "")
    .replace(/\s+/g, " ")
    .trim();
}

function abrirModalHorarioAgente({ equipamento, frota, mensagem, acao, respostaChat }) {
  const modal = document.getElementById("modal-horario-agente");
  const titulo = document.getElementById("modal-horario-titulo");
  const descricao = document.getElementById("modal-horario-descricao");
  const input = document.getElementById("modal-horario-input");
  const resumo = document.getElementById("modal-horario-resumo");
  const botao = document.getElementById("modal-horario-confirmar");

  if (!modal || !titulo || !descricao || !input || !resumo || !botao) {
    return false;
  }

  const ehLiberacao = acao === "liberar";
  const nomeSingular = obterNomeSingular(equipamento);

  confirmacaoHorarioAgente = {
    equipamento,
    frota,
    mensagem,
    acao
  };

  titulo.innerText = ehLiberacao
    ? "Horário da liberação"
    : "Horário da parada";

  descricao.innerText = ehLiberacao
    ? "Informe a data e hora em que o equipamento voltou a trabalhar."
    : "Informe a data e hora em que o equipamento parou.";

  resumo.innerText = `${capitalizar(nomeSingular)} ${frota}\nComando: ${mensagem}`;
  input.value = formatarParaDatetimeLocal(new Date());
  botao.innerText = ehLiberacao ? "Confirmar liberação" : "Confirmar parada";
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  input.focus();

  if (respostaChat) {
    respostaChat.innerText = "Informe a data e hora na janela aberta para concluir o comando.";
  }

  return true;
}

function fecharModalHorarioAgente() {
  const modal = document.getElementById("modal-horario-agente");

  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }
}

function cancelarHorarioAgente() {
  const respostaChat = document.getElementById("resposta-chat");

  confirmacaoHorarioAgente = null;
  fecharModalHorarioAgente();

  if (respostaChat) {
    respostaChat.innerText = "Comando cancelado. Nenhuma alteração foi gravada.";
  }
}

async function confirmarHorarioAgente() {
  const input = document.getElementById("modal-horario-input");
  const respostaChat = document.getElementById("resposta-chat");

  if (!confirmacaoHorarioAgente) {
    fecharModalHorarioAgente();
    return;
  }

  const dataISO = obterDataHoraInputComoISO("modal-horario-input");

  if (!input || !input.value || !dataISO) {
    alert("Informe uma data e hora válida.");
    return;
  }

  const horarioTexto = input.value.replace("T", " ");
  const { equipamento, frota, mensagem, acao } = confirmacaoHorarioAgente;
  const trechoHorario = acao === "liberar"
    ? `liberado em ${horarioTexto}`
    : `parada em ${horarioTexto}`;
  const mensagemComHorario = `${mensagem} | ${trechoHorario}`;

  confirmacaoHorarioAgente = null;
  fecharModalHorarioAgente();

  if (acao === "liberar") {
    await liberarReboquePeloChat(equipamento, frota, mensagemComHorario, respostaChat);
    return;
  }

  await pararReboquePeloChat(equipamento, frota, mensagemComHorario, respostaChat);
}

function anexarDataParadaAoTexto(texto, dataParado) {
  const textoBase = (texto || "").trim();

  if (!dataParado) {
    return textoBase;
  }

  const paradaTexto = `Parada: ${formatarDataHora(dataParado)}`;

  if (normalizarTexto(textoBase).includes("parada:")) {
    return textoBase;
  }

  return textoBase ? `${textoBase} | ${paradaTexto}` : paradaTexto;
}

function extrairDataParadaDoHistorico(item) {
  const texto = `${item.observacao_nova || ""} ${item.mensagem_original || ""}`;
  const match = texto.match(/(?:parada|parado em|ajustou parada para)\s*:?\s*([^|]+)/i);

  if (!match) {
    return null;
  }

  return parseDataHora(match[1].trim());
}

function formatarDuracao(ms) {
  const minutosTotais = Math.max(0, Math.round(ms / 60000));
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;

  if (horas === 0) {
    return `${minutos}min`;
  }

  return `${horas}h ${String(minutos).padStart(2, "0")}min`;
}

function obterIntervaloDia(dataISO) {
  const dataBase = dataISO || obterDataLocalISO();
  const [ano, mes, dia] = dataBase.split("-").map(Number);
  const inicio = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  const fimDia = new Date(ano, mes - 1, dia, 23, 59, 59, 999);
  const agora = new Date();
  const fim = dataBase === obterDataLocalISO(agora) && agora < fimDia ? agora : fimDia;

  return { inicio, fim };
}

function obterConfiguracaoAba(aba = abaAtual) {
  return ABAS_EQUIPAMENTOS[aba] || ABAS_EQUIPAMENTOS.REBOQUES;
}

function tipoPertenceAba(tipo, aba) {
  const tipoNormalizado = normalizarTexto(tipo);
  const config = obterConfiguracaoAba(aba);

  if (!tipoNormalizado && aba === "REBOQUES") {
    return true;
  }

  return config.tipos.some(tipoAba => normalizarTexto(tipoAba) === tipoNormalizado);
}

function obterAbaDoEquipamento(equipamento) {
  const tipo = equipamento ? equipamento.tipo : "";

  if (tipoPertenceAba(tipo, "FRENTES")) {
    return "FRENTES";
  }

  if (tipoPertenceAba(tipo, "COLHEDORAS_TRANSBORDOS")) {
    return "COLHEDORAS_TRANSBORDOS";
  }

  if (tipoPertenceAba(tipo, "CAMINHOES_PROPRIOS")) {
    return "CAMINHOES_PROPRIOS";
  }

  return "REBOQUES";
}

function obterEquipamentosDaAba(equipamentos = equipamentosCarregados, aba = abaAtual) {
  return (equipamentos || []).filter(equipamento => obterAbaDoEquipamento(equipamento) === aba);
}

function estaNaAbaDisponibilidade() {
  return abaAtual === "DISPONIBILIDADE";
}

function estaNaAbaAgente() {
  return abaAtual === "AGENTE";
}

function obterEquipamentosParaDisponibilidade(equipamentos = equipamentosCarregados) {
  return (equipamentos || []).filter(equipamento => obterAbaDoEquipamento(equipamento) !== "FRENTES");
}

function obterEquipamentosOperacionais(equipamentos = equipamentosCarregados) {
  return obterEquipamentosParaDisponibilidade(equipamentos);
}

function obterNomeSingular(equipamento) {
  const tipo = normalizarTexto(equipamento ? equipamento.tipo : "");

  if (tipo.includes("colhedora")) {
    return "colhedora";
  }

  if (tipo.includes("transbordo")) {
    return "transbordo";
  }

  return obterConfiguracaoAba(obterAbaDoEquipamento(equipamento)).singular;
}

function capitalizar(texto) {
  if (!texto) {
    return "";
  }

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function textoSeguro(valor) {
  return (valor || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function codificarParametro(valor) {
  return encodeURIComponent((valor || "").toString());
}

function editarEquipamentoCodificado(equipamentoCodificado) {
  editarEquipamento(JSON.parse(decodeURIComponent(equipamentoCodificado)));
}

function mensagemContemFrota(mensagem, frota) {
  const frotaNormalizada = normalizarTexto(frota).replace(/[^a-z0-9]+/g, " ").trim();
  const mensagemNormalizada = normalizarTexto(mensagem).replace(/[^a-z0-9]+/g, " ").trim();

  if (!frotaNormalizada) {
    return false;
  }

  if (` ${mensagemNormalizada} `.includes(` ${frotaNormalizada} `)) {
    return true;
  }

  const frotaCompacta = compactarTexto(frota);

  if (frotaCompacta.length < 3) {
    return false;
  }

  return compactarTexto(mensagem).includes(frotaCompacta);
}

async function buscarEquipamentoPelaMensagem(mensagem) {
  const { data: equipamentos, error } = await supabaseClient
    .from("equipamentos")
    .select("*")
    .eq("ativo", true);

  if (error) {
    return { equipamento: null, error };
  }

  const equipamentosOrdenados = (equipamentos || [])
    .filter(e => e.frota)
    .sort((a, b) => compactarTexto(b.frota).length - compactarTexto(a.frota).length);

  const equipamento = equipamentosOrdenados.find(e => mensagemContemFrota(mensagem, e.frota)) || null;

  return { equipamento, error: null };
}

function selecionarTipoNoCadastro(tipo) {
  const selectTipo = document.getElementById("cad-tipo");

  if (!selectTipo) {
    return;
  }

  const valor = tipo || obterConfiguracaoAba().tipoPadrao;
  const existeOpcao = Array.from(selectTipo.options).some(option => option.value === valor);

  if (!existeOpcao && valor) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    selectTipo.appendChild(option);
  }

  selectTipo.value = valor;
}

function atualizarCabecalhosDaAba() {
  const config = obterConfiguracaoAba();

  const resumoAba = document.getElementById("resumo-aba");
  const tituloGrafico = document.getElementById("titulo-grafico");
  const tituloTabela = document.getElementById("titulo-tabela");
  const tituloRelatorio = document.getElementById("titulo-relatorio");
  const mensagemChat = document.getElementById("mensagem-chat");
  const relatorio = document.getElementById("relatorio");

  if (resumoAba) {
    resumoAba.innerText = config.descricao;
  }

  if (tituloGrafico) {
    tituloGrafico.innerText = config.tituloGrafico;
  }

  if (tituloTabela) {
    tituloTabela.innerText = config.rotulo;
  }

  if (tituloRelatorio) {
    tituloRelatorio.innerText = config.tituloRelatorioTela;
  }

  if (mensagemChat) {
    mensagemChat.placeholder = estaNaAbaAgente()
      ? "Ex: C2001 parado desde 07:30 vazamento OS 4550 previsão 14:00, T3001 liberado às 10:00, liberar todos da frente 01..."
      : `Digite uma atualização ou cole uma lista de ${config.plural} pendentes...`;
  }

  if (relatorio && !relatorio.value.trim()) {
    relatorio.placeholder = `O relatório de ${config.plural} será gerado aqui...`;
  }

  if (!frotaEmEdicao && !estaNaAbaDisponibilidade() && !estaNaAbaAgente()) {
    selecionarTipoNoCadastro(config.tipoPadrao);
  }
}

function atualizarBotoesAbas() {
  document.querySelectorAll(".aba-equipamento").forEach(botao => {
    const estaAtiva = botao.dataset.aba === abaAtual;
    botao.classList.toggle("ativa", estaAtiva);
    botao.setAttribute("aria-selected", estaAtiva ? "true" : "false");
  });
}

function atualizarContadoresAbas() {
  document.querySelectorAll(".aba-equipamento").forEach(botao => {
    const aba = botao.dataset.aba;
    const config = obterConfiguracaoAba(aba);

    if (aba === "DISPONIBILIDADE" || aba === "AGENTE") {
      const equipamentosOperacionais = obterEquipamentosOperacionais(equipamentosCarregados);
      const totalDisponibilidade = equipamentosOperacionais.length;
      const pendentesDisponibilidade = equipamentosOperacionais.filter(e => e.status === "PENDENTE").length;

      botao.innerHTML = `
        ${config.rotulo}
        <span class="aba-contador">${totalDisponibilidade} ativos | ${pendentesDisponibilidade} pendentes</span>
      `;
      return;
    }

    const total = obterEquipamentosDaAba(equipamentosCarregados, aba).length;
    const pendentes = obterEquipamentosDaAba(equipamentosCarregados, aba).filter(e => e.status === "PENDENTE").length;

    botao.innerHTML = `
      ${config.rotulo}
      <span class="aba-contador">${total} ativos | ${pendentes} pendentes</span>
    `;
  });
}

function atualizarVisibilidadeAbasEspeciais() {
  const mostrarDisponibilidade = estaNaAbaDisponibilidade();
  const mostrarAgente = estaNaAbaAgente();
  const esconderTelaNormal = mostrarDisponibilidade || mostrarAgente;
  const disponibilidadeBox = document.querySelector(".disponibilidade-box");
  const cadastroBox = document.getElementById("cadastro-box");
  const seletoresTelaNormal = [
    ".filtro-box",
    "#texto-filtro",
    ".grafico-box",
    ".acoes",
    "#btn-toggle-cadastro",
    ".relatorio-header",
    "#mensagem-relatorio",
    "#relatorio",
    "#historico-titulo",
    "#btn-atualizar-historico",
    "#historico-box"
  ];

  if (disponibilidadeBox) {
    disponibilidadeBox.style.display = mostrarDisponibilidade ? "block" : "none";
  }

  document.querySelectorAll(".chat-box").forEach(elemento => {
    elemento.style.display = mostrarAgente ? "block" : "none";
  });

  seletoresTelaNormal.forEach(seletor => {
    document.querySelectorAll(seletor).forEach(elemento => {
      elemento.style.display = esconderTelaNormal ? "none" : "";
    });
  });

  document.querySelectorAll(".container > .cards:not(.disponibilidade-cards)").forEach(elemento => {
    elemento.style.display = mostrarDisponibilidade ? "none" : "";
  });

  if (cadastroBox && esconderTelaNormal) {
    cadastroBox.style.display = "none";
  }
}

function atualizarTelaAtual() {
  atualizarCabecalhosDaAba();
  atualizarBotoesAbas();
  atualizarContadoresAbas();
  atualizarVisibilidadeAbasEspeciais();
  atualizarVisibilidadeFrentes();

  if (estaNaAbaDisponibilidade()) {
    atualizarDisponibilidadeDia();
    return;
  }

  const equipamentosIndicadores = obterEquipamentosParaIndicadores();

  preencherResumo(equipamentosIndicadores);

  if (estaNaAbaAgente()) {
    return;
  }

  renderizarGraficoStatus(equipamentosIndicadores);
  aplicarFiltroTabela();
}

function alterarAba(novaAba) {
  if (!ABAS_EQUIPAMENTOS[novaAba]) {
    return;
  }

  abaAtual = novaAba;
  atualizarTelaAtual();

  const relatorio = document.getElementById("relatorio");
  const mensagemRelatorio = document.getElementById("mensagem-relatorio");

  if (relatorio) {
    relatorio.value = "";
    relatorio.placeholder = `O relatório de ${obterConfiguracaoAba().plural} será gerado aqui...`;
  }

  if (mensagemRelatorio) {
    mensagemRelatorio.innerText = "";
  }
}

function atualizarVisibilidadeFrentes() {
  const frentesBox = document.getElementById("frentes-box");
  const tabelaBox = document.getElementById("tabela-equipamentos-box");
  const tituloTabela = document.getElementById("titulo-tabela");
  const estaNaAbaFrentes = abaAtual === "FRENTES";
  const estaNaDisponibilidade = estaNaAbaDisponibilidade();
  const estaNoAgente = estaNaAbaAgente();

  if (frentesBox) {
    frentesBox.style.display = estaNaAbaFrentes ? "block" : "none";
  }

  if (tabelaBox) {
    tabelaBox.style.display = estaNaAbaFrentes || estaNaDisponibilidade || estaNoAgente ? "none" : "block";
  }

  if (tituloTabela) {
    tituloTabela.style.display = estaNaAbaFrentes || estaNaDisponibilidade || estaNoAgente ? "none" : "block";
  }

  if (estaNaAbaFrentes) {
    preencherSelectFrentes();
    renderizarFrentesDeColheita();
  }
}

function obterFrentesCadastradas() {
  return obterEquipamentosDaAba(equipamentosCarregados, "FRENTES");
}

function obterEquipamentosDaFrente(frente) {
  const frenteNormalizada = normalizarTexto(frente);

  return obterEquipamentosDaAba(equipamentosCarregados, "COLHEDORAS_TRANSBORDOS")
    .filter(equipamento => normalizarTexto(equipamento.conjunto) === frenteNormalizada);
}

function equipamentoPertenceFrenteTexto(equipamento, frenteTexto) {
  const conjunto = normalizarTexto(equipamento?.conjunto || "");
  const frente = normalizarTexto(frenteTexto || "");

  if (!conjunto || !frente) {
    return false;
  }

  return conjunto === frente || conjunto.includes(frente) || frente.includes(conjunto);
}

function obterFrenteAlvoDaMensagem(mensagem) {
  const frentes = obterFrentesCadastradas();
  const frenteCadastrada = frentes.find(frente => mensagemContemFrota(mensagem, frente.frota));

  if (frenteCadastrada) {
    return {
      nome: frenteCadastrada.frota,
      cadastrada: true
    };
  }

  const match = (mensagem || "").match(/frente\s*(?:de\s*colheita\s*)?[:#-]?\s*([A-Za-z0-9À-ÿ ._-]+)/i);

  if (!match) {
    return null;
  }

  const nome = match[1]
    .replace(/\b(liberar|todos|todas|pendentes|agora|ok)\b/gi, "")
    .replace(/[.,;]+$/g, "")
    .trim();

  return nome ? { nome, cadastrada: false } : null;
}

function obterDescricaoAcaoAtual() {
  if (estaNaAbaAgente()) {
    return {
      singular: "equipamento",
      plural: "equipamentos do sistema"
    };
  }

  if (estaNaAbaDisponibilidade()) {
    return {
      singular: "equipamento",
      plural: "equipamentos"
    };
  }

  if (abaAtual === "FRENTES") {
    return {
      singular: "equipamento da frente",
      plural: "equipamentos cadastrados nas frentes"
    };
  }

  const config = obterConfiguracaoAba();

  return {
    singular: config.singular,
    plural: config.plural
  };
}

function obterEquipamentosParaAcaoNaAba(equipamentos) {
  if (estaNaAbaDisponibilidade() || estaNaAbaAgente()) {
    return obterEquipamentosOperacionais(equipamentos);
  }

  if (abaAtual === "FRENTES") {
    return obterEquipamentosDaAba(equipamentos, "COLHEDORAS_TRANSBORDOS")
      .filter(equipamento => equipamento.conjunto && equipamento.conjunto.trim() !== "");
  }

  return obterEquipamentosDaAba(equipamentos);
}

function obterEquipamentosParaIndicadores(equipamentos = equipamentosCarregados) {
  return obterEquipamentosParaAcaoNaAba(equipamentos);
}

function ehStatusPendente(status) {
  return normalizarTexto(status) === "pendente";
}

function ehStatusOk(status) {
  return normalizarTexto(status) === "ok";
}

function obterEventosHistoricoDoEquipamento(frota, equipamento) {
  const eventos = historicoCarregado
    .filter(item => item.frota === frota && item.created_at)
    .map(item => {
      const statusNovo = item.status_novo || "";
      const dataHistorico = parseDataHora(item.created_at);
      const dataParadaHistorico = ehStatusPendente(statusNovo)
        ? extrairDataParadaDoHistorico(item)
        : null;

      return {
        data: dataParadaHistorico || dataHistorico,
        statusNovo,
        acao: item.acao || ""
      };
    })
    .filter(evento => evento.data);

  if (ehStatusPendente(equipamento.status) && equipamento.data_parado) {
    const dataParado = parseDataHora(equipamento.data_parado);

    if (dataParado) {
      eventos.push({
        data: dataParado,
        statusNovo: "PENDENTE",
        acao: "PARADA_ATUAL"
      });
    }
  }

  return eventos.sort((a, b) => a.data - b.data);
}

function calcularParadasDoEquipamento(equipamento, dataISO) {
  const { inicio, fim } = obterIntervaloDia(dataISO);
  const eventos = obterEventosHistoricoDoEquipamento(equipamento.frota, equipamento);
  let paradoDesde = null;
  const intervalos = [];

  eventos.forEach(evento => {
    if (evento.data > fim) {
      return;
    }

    if (ehStatusPendente(evento.statusNovo)) {
      if (!paradoDesde) {
        paradoDesde = evento.data;
      }

      return;
    }

    if (ehStatusOk(evento.statusNovo)) {
      if (paradoDesde) {
        const inicioIntervalo = paradoDesde < inicio ? inicio : paradoDesde;
        const fimIntervalo = evento.data > fim ? fim : evento.data;

        if (fimIntervalo > inicioIntervalo) {
          intervalos.push({
            inicio: inicioIntervalo,
            fim: fimIntervalo,
            duracaoMs: fimIntervalo - inicioIntervalo
          });
        }
      }

      paradoDesde = null;
    }
  });

  if (paradoDesde && fim > inicio) {
    const inicioIntervalo = paradoDesde < inicio ? inicio : paradoDesde;

    if (fim > inicioIntervalo) {
      intervalos.push({
        inicio: inicioIntervalo,
        fim,
        duracaoMs: fim - inicioIntervalo
      });
    }
  }

  const tempoParadoMs = intervalos.reduce((total, intervalo) => total + intervalo.duracaoMs, 0);
  const tempoBaseMs = Math.max(0, fim - inicio);
  const disponibilidade = tempoBaseMs > 0
    ? Math.max(0, ((tempoBaseMs - tempoParadoMs) / tempoBaseMs) * 100)
    : 0;

  return {
    intervalos,
    tempoParadoMs,
    tempoBaseMs,
    disponibilidade
  };
}

function obterResumoLiberacao(equipamento, retorno = new Date()) {
  const parada = parseDataHora(equipamento.data_parado);

  if (!parada) {
    return {
      texto: "Liberado",
      tempoMs: 0,
      parada: null,
      retorno
    };
  }

  const tempoMs = Math.max(0, retorno - parada);
  const texto =
    `Liberado | Parada: ${formatarDataHora(parada)} | ` +
    `Início: ${formatarDataHora(retorno)} | ` +
    `Tempo parado: ${formatarDuracao(tempoMs)}`;

  return {
    texto,
    tempoMs,
    parada,
    retorno
  };
}

function inicializarDataDisponibilidade() {
  const input = document.getElementById("data-disponibilidade");

  if (input && !input.value) {
    input.value = obterDataLocalISO();
  }
}

function atualizarDisponibilidadeDia() {
  const inputData = document.getElementById("data-disponibilidade");
  const tbody = document.getElementById("tabela-disponibilidade");
  const totalEquipamentos = document.getElementById("disp-equipamentos");
  const tempoParado = document.getElementById("disp-tempo-parado");
  const percentual = document.getElementById("disp-percentual");
  const texto = document.getElementById("texto-disponibilidade");

  if (!tbody || !inputData) {
    return;
  }

  if (!inputData.value) {
    inputData.value = obterDataLocalISO();
  }

  const dataISO = inputData.value;
  const equipamentosBase = estaNaAbaDisponibilidade()
    ? obterEquipamentosParaDisponibilidade()
    : obterEquipamentosParaIndicadores();
  const resultados = calcularDisponibilidadeEquipamentos(equipamentosBase, dataISO);

  const tempoParadoTotal = resultados.reduce((total, item) => total + item.calculo.tempoParadoMs, 0);
  const tempoBaseTotal = resultados.reduce((total, item) => total + item.calculo.tempoBaseMs, 0);
  const disponibilidadeGeral = tempoBaseTotal > 0
    ? Math.max(0, ((tempoBaseTotal - tempoParadoTotal) / tempoBaseTotal) * 100)
    : 0;

  if (totalEquipamentos) {
    totalEquipamentos.innerText = resultados.length;
  }

  if (tempoParado) {
    tempoParado.innerText = formatarDuracao(tempoParadoTotal);
  }

  if (percentual) {
    percentual.innerText = `${disponibilidadeGeral.toFixed(1)}%`;
  }

  if (texto) {
    texto.innerText = `Disponibilidade calculada para ${obterDescricaoAcaoAtual().plural}: ${disponibilidadeGeral.toFixed(1)}%`;
  }

  atualizarGraficosDisponibilidade(resultados);
  renderizarDisponibilidadePorFrente(dataISO);

  if (resultados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Nenhum equipamento para calcular disponibilidade.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = resultados.map(({ equipamento, calculo }) => `
    <tr>
      <td>${textoSeguro(equipamento.frota)}</td>
      <td>${textoSeguro(equipamento.tipo || "-")}</td>
      <td>${textoSeguro(equipamento.conjunto || "-")}</td>
      <td>${calculo.intervalos.length}</td>
      <td>${formatarDuracao(calculo.tempoParadoMs)}</td>
      <td>${calculo.disponibilidade.toFixed(1)}%</td>
    </tr>
  `).join("");
}

function calcularDisponibilidadeEquipamentos(equipamentos, dataISO) {
  return (equipamentos || []).map(equipamento => ({
    equipamento,
    calculo: calcularParadasDoEquipamento(equipamento, dataISO)
  }));
}

function calcularResumoDisponibilidade(resultados) {
  const tempoParadoTotal = resultados.reduce((total, item) => total + item.calculo.tempoParadoMs, 0);
  const tempoBaseTotal = resultados.reduce((total, item) => total + item.calculo.tempoBaseMs, 0);
  const disponibilidade = tempoBaseTotal > 0
    ? Math.max(0, ((tempoBaseTotal - tempoParadoTotal) / tempoBaseTotal) * 100)
    : 0;

  return {
    equipamentos: resultados.length,
    tempoParadoTotal,
    disponibilidade,
    paradas: resultados.reduce((total, item) => total + item.calculo.intervalos.length, 0)
  };
}

function destruirGraficoDisponibilidade(grafico) {
  if (grafico && typeof grafico.destroy === "function") {
    grafico.destroy();
  }
}

function destruirGraficosDisponibilidadeFrentes() {
  graficosDisponibilidadeFrentes.forEach(grafico => destruirGraficoDisponibilidade(grafico));
  graficosDisponibilidadeFrentes = [];
}

function formatarPercentualGrafico(valor, total) {
  return total > 0 ? `${((valor / total) * 100).toFixed(1)}%` : "0.0%";
}

function atualizarLegendaGrafico(id, texto) {
  const legenda = document.getElementById(id);

  if (legenda) {
    legenda.innerText = texto;
  }
}

function criarGraficoPizza(canvasId, labels, valores, cores, opcoes = {}) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || typeof Chart === "undefined") {
    return null;
  }

  const valoresNumericos = valores.map(valor => Math.max(0, Number(valor) || 0));
  const total = valoresNumericos.reduce((soma, valor) => soma + valor, 0);
  const semDados = total <= 0;
  const labelsGrafico = semDados ? ["Sem dados"] : labels;
  const dadosGrafico = semDados ? [1] : valoresNumericos;
  const coresGrafico = semDados ? ["#cbd5e1"] : cores;

  return new Chart(canvas.getContext("2d"), {
    type: "pie",
    data: {
      labels: labelsGrafico,
      datasets: [
        {
          data: dadosGrafico,
          backgroundColor: coresGrafico,
          borderColor: "#ffffff",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label(context) {
              if (semDados) {
                return "Sem dados para exibir";
              }

              const valor = context.raw || 0;
              const percentual = formatarPercentualGrafico(valor, total);
              const textoValor = opcoes.formatarValor ? opcoes.formatarValor(valor) : valor;

              return `${context.label}: ${textoValor} (${percentual})`;
            }
          }
        }
      }
    }
  });
}

function obterTipoResumoDisponibilidade(equipamento) {
  const aba = obterAbaDoEquipamento(equipamento);

  if (equipamentoEhColhedora(equipamento)) {
    return "Colhedoras";
  }

  if (equipamentoEhTransbordo(equipamento)) {
    return "Transbordos";
  }

  if (aba === "CAMINHOES_PROPRIOS") {
    return "Caminhões";
  }

  return "Reboques";
}

function atualizarGraficosDisponibilidade(resultados) {
  const resumo = calcularResumoDisponibilidade(resultados);
  const tempoOperando = Math.max(0, resumo.equipamentos > 0
    ? resultados.reduce((total, item) => total + Math.max(0, item.calculo.tempoBaseMs - item.calculo.tempoParadoMs), 0)
    : 0);
  const ok = resultados.filter(({ equipamento }) => ehStatusOk(equipamento.status)).length;
  const pendentes = resultados.filter(({ equipamento }) => ehStatusPendente(equipamento.status)).length;
  const tempoPorTipo = resultados.reduce((totais, { equipamento, calculo }) => {
    const tipo = obterTipoResumoDisponibilidade(equipamento);
    totais[tipo] = (totais[tipo] || 0) + calculo.tempoParadoMs;
    return totais;
  }, {});
  const tipos = ["Reboques", "Colhedoras", "Transbordos", "Caminhões"];

  destruirGraficoDisponibilidade(graficoDisponibilidadeGeral);
  destruirGraficoDisponibilidade(graficoDisponibilidadeStatus);
  destruirGraficoDisponibilidade(graficoDisponibilidadeTipos);

  graficoDisponibilidadeGeral = criarGraficoPizza(
    "grafico-disponibilidade-geral",
    ["Tempo disponível", "Tempo parado"],
    [tempoOperando, resumo.tempoParadoTotal],
    ["#22c55e", "#ef4444"],
    { formatarValor: formatarDuracao }
  );

  graficoDisponibilidadeStatus = criarGraficoPizza(
    "grafico-disponibilidade-status",
    ["OK", "Pendentes"],
    [ok, pendentes],
    ["#22c55e", "#ef4444"]
  );

  graficoDisponibilidadeTipos = criarGraficoPizza(
    "grafico-disponibilidade-tipos",
    tipos,
    tipos.map(tipo => tempoPorTipo[tipo] || 0),
    ["#2563eb", "#f59e0b", "#14b8a6", "#8b5cf6"],
    { formatarValor: formatarDuracao }
  );

  atualizarLegendaGrafico(
    "legenda-disponibilidade-geral",
    `${resumo.disponibilidade.toFixed(1)}% disponível | ${formatarDuracao(resumo.tempoParadoTotal)} parado`
  );
  atualizarLegendaGrafico(
    "legenda-disponibilidade-status",
    `${ok} equipamentos OK | ${pendentes} pendentes`
  );
  atualizarLegendaGrafico(
    "legenda-disponibilidade-tipos",
    resumo.tempoParadoTotal > 0
      ? `Total parado no dia: ${formatarDuracao(resumo.tempoParadoTotal)}`
      : "Sem tempo parado registrado no dia"
  );
}

function atualizarGraficoDisponibilidadeTipo(chartId, resultados) {
  const resumo = calcularResumoDisponibilidade(resultados);
  const tempoOperando = resultados.reduce(
    (total, item) => total + Math.max(0, item.calculo.tempoBaseMs - item.calculo.tempoParadoMs),
    0
  );
  const grafico = criarGraficoPizza(
    chartId,
    ["Tempo disponível", "Tempo parado"],
    [tempoOperando, resumo.tempoParadoTotal],
    ["#22c55e", "#ef4444"],
    { formatarValor: formatarDuracao }
  );

  atualizarLegendaGrafico(
    `${chartId}-legenda`,
    resumo.equipamentos > 0
      ? `${resumo.disponibilidade.toFixed(1)}% disponível | ${formatarDuracao(resumo.tempoParadoTotal)} parado`
      : "Sem equipamentos cadastrados"
  );

  if (grafico) {
    graficosDisponibilidadeFrentes.push(grafico);
  }
}

function equipamentoEhColhedora(equipamento) {
  return normalizarTexto(equipamento.tipo).includes("colhedora");
}

function equipamentoEhTransbordo(equipamento) {
  return normalizarTexto(equipamento.tipo).includes("transbordo");
}

function renderizarTabelaDisponibilidadeTipo(resultados) {
  if (resultados.length === 0) {
    return `
      <tr>
        <td colspan="4">Nenhum equipamento cadastrado.</td>
      </tr>
    `;
  }

  return resultados.map(({ equipamento, calculo }) => `
    <tr>
      <td>${textoSeguro(equipamento.frota)}</td>
      <td>${calculo.intervalos.length}</td>
      <td>${formatarDuracao(calculo.tempoParadoMs)}</td>
      <td>${calculo.disponibilidade.toFixed(1)}%</td>
    </tr>
  `).join("");
}

function renderizarDisponibilidadeTipo(titulo, resultados, chartId) {
  const resumo = calcularResumoDisponibilidade(resultados);

  return `
    <div class="disponibilidade-tipo-card">
      <h4>${titulo}</h4>

      ${chartId ? `
        <div class="grafico-pizza-wrap grafico-pizza-mini">
          <canvas id="${chartId}"></canvas>
        </div>
        <p id="${chartId}-legenda" class="grafico-legenda">Aguardando cálculo.</p>
      ` : ""}

      <div class="disponibilidade-frente-metricas">
        <div class="disponibilidade-metrica">
          <span>Equipamentos</span>
          <strong>${resumo.equipamentos}</strong>
        </div>
        <div class="disponibilidade-metrica">
          <span>Tempo parado</span>
          <strong>${formatarDuracao(resumo.tempoParadoTotal)}</strong>
        </div>
        <div class="disponibilidade-metrica">
          <span>Disponibilidade</span>
          <strong>${resumo.disponibilidade.toFixed(1)}%</strong>
        </div>
      </div>

      <div class="tabela-scroll">
        <table>
          <thead>
            <tr>
              <th>Frota</th>
              <th>Paradas</th>
              <th>Tempo Parado</th>
              <th>Disponibilidade</th>
            </tr>
          </thead>
          <tbody>${renderizarTabelaDisponibilidadeTipo(resultados)}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderizarDisponibilidadePorFrente(dataISO) {
  const container = document.getElementById("disponibilidade-frentes");

  if (!container) {
    return;
  }

  destruirGraficosDisponibilidadeFrentes();

  if (!estaNaAbaDisponibilidade()) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "grid";

  const frentes = obterFrentesCadastradas();

  if (frentes.length === 0) {
    container.innerHTML = `
      <h3 class="disponibilidade-secao-titulo">Disponibilidade por Frente de Colheita</h3>
      <div class="disponibilidade-frente-card">
        <p class="grupo-vazio">Nenhuma frente cadastrada para calcular.</p>
      </div>
    `;
    return;
  }

  const graficosFrentes = [];
  const cards = frentes.map((frente, indice) => {
    const equipamentos = obterEquipamentosDaFrente(frente.frota);
    const resultados = calcularDisponibilidadeEquipamentos(equipamentos, dataISO);
    const resumo = calcularResumoDisponibilidade(resultados);
    const resultadosColhedoras = resultados.filter(({ equipamento }) => equipamentoEhColhedora(equipamento));
    const resultadosTransbordos = resultados.filter(({ equipamento }) => equipamentoEhTransbordo(equipamento));
    const idBase = compactarTexto(frente.frota) || `frente-${indice + 1}`;
    const chartColhedoras = `grafico-disponibilidade-${idBase}-colhedoras`;
    const chartTransbordos = `grafico-disponibilidade-${idBase}-transbordos`;

    graficosFrentes.push(
      { chartId: chartColhedoras, resultados: resultadosColhedoras },
      { chartId: chartTransbordos, resultados: resultadosTransbordos }
    );

    return `
      <div class="disponibilidade-frente-card">
        <div class="disponibilidade-frente-header">
          <div>
            <h3>${textoSeguro(frente.frota)}</h3>
            <p>${textoSeguro(frente.observacao || "Sem observação")}</p>
          </div>

          <span class="frente-tag">${textoSeguro(frente.status || "OK")}</span>
        </div>

        <div class="disponibilidade-frente-metricas">
          <div class="disponibilidade-metrica">
            <span>Equipamentos</span>
            <strong>${resumo.equipamentos}</strong>
          </div>
          <div class="disponibilidade-metrica">
            <span>Tempo parado</span>
            <strong>${formatarDuracao(resumo.tempoParadoTotal)}</strong>
          </div>
          <div class="disponibilidade-metrica">
            <span>Disponibilidade</span>
            <strong>${resumo.disponibilidade.toFixed(1)}%</strong>
          </div>
        </div>

        <div class="disponibilidade-tipos">
          ${renderizarDisponibilidadeTipo("Colhedoras", resultadosColhedoras, chartColhedoras)}
          ${renderizarDisponibilidadeTipo("Transbordos", resultadosTransbordos, chartTransbordos)}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <h3 class="disponibilidade-secao-titulo">Disponibilidade por Frente de Colheita</h3>
    ${cards}
  `;

  graficosFrentes.forEach(({ chartId, resultados }) => {
    atualizarGraficoDisponibilidadeTipo(chartId, resultados);
  });
}

function preencherSelectFrentes() {
  const select = document.getElementById("vinculo-frente");

  if (!select) {
    return;
  }

  const valorAtual = select.value;
  const frentes = obterFrentesCadastradas();

  select.innerHTML = `<option value="">Selecione a frente</option>`;

  frentes.forEach(frente => {
    const option = document.createElement("option");
    option.value = frente.frota;
    option.textContent = frente.frota;
    select.appendChild(option);
  });

  if (frentes.some(frente => frente.frota === valorAtual)) {
    select.value = valorAtual;
  }
}

function filtrarFrentesPorStatus(frentes) {
  if (filtroStatusAtual === "PENDENTE") {
    return frentes.filter(frente =>
      obterEquipamentosDaFrente(frente.frota).some(equipamento => equipamento.status === "PENDENTE")
    );
  }

  if (filtroStatusAtual === "OK") {
    return frentes.filter(frente => {
      const equipamentos = obterEquipamentosDaFrente(frente.frota);
      return equipamentos.length > 0 && equipamentos.every(equipamento => equipamento.status === "OK");
    });
  }

  return frentes;
}

function renderizarGrupoFrente(titulo, equipamentos) {
  const itens = equipamentos.map(equipamento => `
    <div class="equipamento-frente">
      <strong>${textoSeguro(equipamento.frota)}</strong>
      <span class="${equipamento.status === "OK" ? "status-ok" : "status-pendente"}">${textoSeguro(equipamento.status || "-")}</span>
      <span>${textoSeguro(equipamento.observacao || "-")}</span>
      <button class="btn-editar" onclick="editarEquipamentoCodificado('${codificarParametro(JSON.stringify(equipamento))}')">Editar</button>
      <button class="btn-excluir" onclick="excluirEquipamento(decodeURIComponent('${codificarParametro(equipamento.frota)}'))">Excluir</button>
    </div>
  `).join("");

  return `
    <div class="grupo-frente">
      <h4>${titulo}</h4>
      ${itens || `<p class="grupo-vazio">Nenhum item cadastrado.</p>`}
    </div>
  `;
}

function renderizarFrentesDeColheita() {
  const lista = document.getElementById("lista-frentes");

  if (!lista) {
    return;
  }

  const frentes = filtrarFrentesPorStatus(obterFrentesCadastradas());

  if (frentes.length === 0) {
    lista.innerHTML = `
      <div class="frente-card">
        <p class="grupo-vazio">Nenhuma frente cadastrada nesta seleção.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = frentes.map(frente => {
    const vinculados = obterEquipamentosDaFrente(frente.frota);
    const colhedoras = vinculados.filter(equipamento => tipoPertenceAba(equipamento.tipo, "COLHEDORAS_TRANSBORDOS") && normalizarTexto(equipamento.tipo).includes("colhedora"));
    const transbordos = vinculados.filter(equipamento => normalizarTexto(equipamento.tipo).includes("transbordo"));
    const pendentes = vinculados.filter(equipamento => equipamento.status === "PENDENTE").length;

    return `
      <div class="frente-card">
        <div class="frente-card-header">
          <div>
            <h3>${textoSeguro(frente.frota)}</h3>
            <p>${textoSeguro(frente.observacao || "Sem observação")}</p>
          </div>

          <div class="frente-resumo">
            <span class="frente-tag">${textoSeguro(frente.status || "OK")}</span>
            <span class="frente-tag">${colhedoras.length} colhedoras</span>
            <span class="frente-tag">${transbordos.length} transbordos</span>
            <span class="frente-tag">${pendentes} pendentes</span>
          </div>
        </div>

        <div class="frente-grupos">
          ${renderizarGrupoFrente("Colhedoras", colhedoras)}
          ${renderizarGrupoFrente("Transbordos", transbordos)}
        </div>
      </div>
    `;
  }).join("");
}

async function carregarEquipamentos() {
  try {
    const { data: equipamentos, error } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("ativo", true)
      .order("frota", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erro ao carregar equipamentos.");
      return;
    }

    equipamentosCarregados = equipamentos || [];

    atualizarTelaAtual();

  } catch (erro) {
    alert("Erro ao carregar equipamentos.");
    console.error(erro);
  }
}

function preencherResumo(equipamentos) {
  const total = equipamentos.length;
  const ok = equipamentos.filter(e => e.status === "OK").length;
  const pendentes = equipamentos.filter(e => e.status === "PENDENTE").length;

  document.getElementById("total").innerText = total;
  document.getElementById("ok").innerText = ok;
  document.getElementById("pendentes").innerText = pendentes;
}

function preencherTabela(equipamentos) {
  const tbody = document.getElementById("tabela-equipamentos");
  tbody.innerHTML = "";

  if (!equipamentos || equipamentos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">Nenhum item cadastrado nesta aba.</td>
      </tr>
    `;
    return;
  }

  equipamentos.forEach(e => {
    const tr = document.createElement("tr");

  tr.innerHTML = `
  <td><strong>${textoSeguro(e.frota)}</strong></td>
  <td>${textoSeguro(e.tipo || "-")}</td>
  <td>${textoSeguro(e.placa || "-")}</td>
  <td class="${e.status === "OK" ? "status-ok" : "status-pendente"}">${e.status}</td>
  <td>${textoSeguro(e.observacao || "-")}</td>
  <td>${textoSeguro(e.numero_os || "-")}</td>
  <td>${formatarDataHora(e.data_parado)}</td>
  <td>${textoSeguro(e.previsao_saida || "-")}</td>
 <td>
  <button class="btn-editar" onclick="editarEquipamentoCodificado('${codificarParametro(JSON.stringify(e))}')">
    Editar
  </button>

 <button class="btn-excluir" onclick="excluirEquipamento(decodeURIComponent('${codificarParametro(e.frota)}'))">
  Excluir
</button>
</td>
`;

    tbody.appendChild(tr);
  });
}

async function gerarRelatorio() {
  try {
    const { data: equipamentos, error } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("ativo", true)
      .order("frota", { ascending: true });

    if (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Erro ao gerar relatório.");
      return;
    }

    const config = obterConfiguracaoAba();
    const descricao = obterDescricaoAcaoAtual();
    const equipamentosDaAba = obterEquipamentosParaIndicadores(equipamentos || []);
    const total = equipamentosDaAba.length;
    const ok = equipamentosDaAba.filter(e => e.status === "OK").length;
    const pendentesLista = equipamentosDaAba.filter(e => e.status === "PENDENTE");

    const pendentesComPrevisao = pendentesLista.filter(e =>
      e.previsao_saida && e.previsao_saida.trim() !== ""
    );

    const pendentesSemPrevisao = pendentesLista.filter(e =>
      !e.previsao_saida || e.previsao_saida.trim() === ""
    );

    const pendentes = pendentesLista.length;
    const semPrevisao = pendentesSemPrevisao.length;

    let texto = "";

    texto += `${config.tituloRelatorio}\n`;
    texto += `Data/Hora: ${new Date().toLocaleString("pt-BR")}\n\n`;

    texto += "RESUMO:\n";
    texto += `Total ativos: ${total}\n`;
    texto += `OK: ${ok}\n`;
    texto += `Pendentes: ${pendentes}\n`;
    texto += `Sem previsão: ${semPrevisao}\n\n`;

    texto += "PENDENTES COM PREVISÃO:\n\n";

    if (pendentesComPrevisao.length === 0) {
      texto += `Nenhum ${descricao.singular} pendente com previsão no momento.\n\n`;
    }

    pendentesComPrevisao.forEach(e => {
  texto += `🛑 ${e.frota}\n`;
  texto += `Problema: ${e.observacao || "Sem observação"}\n`;
  texto += `O.S: ${e.numero_os || "Não informada"}\n`;
  texto += `Previsão: ${e.previsao_saida || "Sem previsão"}\n\n`;
});

    texto += "\nSEM PREVISÃO:\n\n";

    if (pendentesSemPrevisao.length === 0) {
      texto += `Nenhum ${descricao.singular} pendente sem previsão.\n`;
    }

   pendentesSemPrevisao.forEach(e => {
  texto += `🛑 ${e.frota}\n`;
  texto += `Problema: ${e.observacao || "Sem observação"}\n`;
  texto += `O.S: ${e.numero_os || "Não informada"}\n`;
  texto += `Previsão: Sem previsão\n\n`;
});

    document.getElementById("relatorio").value = texto;

    const mensagemRelatorio = document.getElementById("mensagem-relatorio");

if (mensagemRelatorio) {
  mensagemRelatorio.innerText = "Relatório gerado com sucesso. Agora você pode copiar e enviar no WhatsApp.";
}

  } catch (erro) {
    alert("Erro ao gerar relatório.");
    console.error(erro);
  }
}

async function copiarRelatorio() {
  const texto = document.getElementById("relatorio").value;

  if (!texto.trim()) {
    alert("Gere o relatório primeiro.");
    return;
  }

  await navigator.clipboard.writeText(texto);

const mensagemRelatorio = document.getElementById("mensagem-relatorio");

if (mensagemRelatorio) {
  mensagemRelatorio.innerText = "Relatório copiado para a área de transferência.";
}

alert("Relatório copiado!");
}

async function enviarMensagemChat() {
  const input = document.getElementById("mensagem-chat");
  const respostaChat = document.getElementById("resposta-chat");

  const mensagem = input.value.trim();

  if (!mensagem) {
    alert("Digite uma mensagem para o agente.");
    return;
  }

  try {
    const texto = mensagem.toLowerCase();
    const config = obterConfiguracaoAba();
    const descricaoAcao = obterDescricaoAcaoAtual();

    if (texto.includes("liberar todos") || texto.includes("liberar todas")) {
      const frenteAlvo = texto.includes("frente")
        ? obterFrenteAlvoDaMensagem(mensagem)
        : null;

      if (texto.includes("frente") && !frenteAlvo) {
        respostaChat.innerText =
          "Você pediu para liberar uma frente, mas não consegui identificar qual.\n\n" +
          "Exemplo: liberar todos da frente 01";
        return;
      }

      confirmacaoMassa = {
        tipo: "liberar_todos",
        frente: frenteAlvo?.nome || ""
      };

      const alvoTexto = frenteAlvo
        ? `os equipamentos pendentes da frente ${frenteAlvo.nome}`
        : `os ${descricaoAcao.plural} pendentes`;

      respostaChat.innerHTML = `
        <div>
          Atenção: você pediu para liberar TODOS ${alvoTexto}.<br><br>
          Deseja realmente alterar esses equipamentos pendentes para OK?
        </div>
        <div class="confirmacao-acoes">
          <button onclick="confirmarAcaoEmMassa('confirmar')">Sim, liberar todos</button>
          <button class="btn-secondary" onclick="confirmarAcaoEmMassa('cancelar')">Cancelar</button>
        </div>
      `;

      input.value = "";
      return;
    }

const itensLista = extrairListaPendentes(mensagem);
const pareceLista = mensagem.includes("🛑") || itensLista.length > 1;

if (pareceLista) {
  await processarListaDePendentes(mensagem, respostaChat);
  input.value = "";
  return;
}

    const { equipamento, error: erroBuscaMensagem } = await buscarEquipamentoPelaMensagem(mensagem);

    if (erroBuscaMensagem) {
      console.error("Erro ao buscar frota pela mensagem:", erroBuscaMensagem);
      respostaChat.innerText = "Erro ao buscar a frota informada.";
      return;
    }

    if (!equipamento) {
      respostaChat.innerText =
        "Não consegui identificar uma frota cadastrada nessa mensagem.\n\n" +
        "Exemplos:\n" +
        "C2001 parado desde 07:30 vazamento hidráulico OS 4550 previsão 14:00\n" +
        "T3001 liberado às 10:00\n" +
        "liberar todos da frente 01\n" +
        "6242 previsão hoje 16h";
      return;
    }

    const frota = equipamento.frota;

    const palavrasLiberado = [
  "liberado",
  "liberada",
  "liberados",
  "liberadas",
  "liberar",
  "ok",
  "pronto",
  "pronta",
  "saiu",
  "saíram",
  "sairam"
];
    const palavrasPendente = ["parado", "pendente", "manutenção", "manutencao", "oficina"];

    const querLiberar = palavrasLiberado.some(p => texto.includes(p));
    const querParar = palavrasPendente.some(p => texto.includes(p));
    const horarioInformado = extrairDataHoraParadaDaMensagem(mensagem);

    const querRemoverPrevisao =
      texto.includes("sem previsão") ||
      texto.includes("sem previsao");

    const matchPrevisaoRapida = mensagem.match(/previs[aã]o\s*(?:para|pra|:|-)?\s*([\s\S]*?)(?=\s+(?:os|o\.s|o\.s\.|ordem)\b|$)/i);

    const matchOSRapida = mensagem.match(/(?:alterar\s*)?(?:os|o\.s|o\.s\.|ordem)\s*(?:para|pra|:|-)?\s*(\d+)/i);

    if (!querLiberar && !querParar && (querRemoverPrevisao || matchPrevisaoRapida || matchOSRapida)) {
      await processarAlteracaoRapida({
        equipamento,
        frota,
        mensagem,
        querRemoverPrevisao,
        matchPrevisaoRapida,
        matchOSRapida,
        respostaChat
      });

      input.value = "";
      return;
    }

    if (!querLiberar && !querParar) {
      respostaChat.innerText =
        "Não entendi o comando.\n\n" +
        "Exemplos:\n" +
        "6242 liberado às 10:00\n" +
        "6242 parado desde ontem 14h30 trocar travessas OS 3000 previsão amanhã 08h\n" +
        "liberar todos da frente 01\n" +
        "6242 previsão hoje 16h\n" +
        "6242 sem previsão\n" +
        "6242 OS 4500";
      return;
    }

    if (querLiberar) {
      if (!horarioInformado && abrirModalHorarioAgente({
        equipamento,
        frota,
        mensagem,
        acao: "liberar",
        respostaChat
      })) {
        input.value = "";
        return;
      }

      await liberarReboquePeloChat(equipamento, frota, mensagem, respostaChat);
      input.value = "";
      return;
    }

    if (querParar) {
      if (!horarioInformado && abrirModalHorarioAgente({
        equipamento,
        frota,
        mensagem,
        acao: "parar",
        respostaChat
      })) {
        input.value = "";
        return;
      }

      await pararReboquePeloChat(equipamento, frota, mensagem, respostaChat);
      input.value = "";
      return;
    }

  } catch (erro) {
    respostaChat.innerText = "Erro ao enviar mensagem para o agente.";
    console.error(erro);
  }
}

async function confirmarAlteracao(tipoConfirmacao) {
  const respostaChat = document.getElementById("resposta-chat");

  if (!confirmacaoPendente) {
    respostaChat.innerText = "Não existe alteração pendente para confirmar.";
    return;
  }

  if (tipoConfirmacao === "cancelar") {
    confirmacaoPendente = null;
    respostaChat.innerText = "Alteração cancelada. Nenhuma informação foi modificada.";
    return;
  }

  try {
    const { frota, motivoNovo, numeroOSNovo, previsaoNova, dataParadoNovo } = confirmacaoPendente;

    const { data: equipamento, error: erroBusca } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("frota", frota)
      .maybeSingle();

    if (erroBusca || !equipamento) {
      respostaChat.innerText = `Não encontrei nenhum equipamento com a frota ${frota}.`;
      return;
    }

    const nomeSingular = obterNomeSingular(equipamento);

    let novaObservacao = "";
    let acaoHistorico = "";

    if (tipoConfirmacao === "substituir") {
      novaObservacao = motivoNovo || "Motivo não informado";
      acaoHistorico = "SUBSTITUIU_MOTIVO";
    }

    if (tipoConfirmacao === "adicionar") {
      novaObservacao = equipamento.observacao
        ? `${equipamento.observacao}; ${motivoNovo}`
        : motivoNovo;

      acaoHistorico = "ADICIONOU_PROBLEMA";
    }

    const novaOS = numeroOSNovo || equipamento.numero_os || "";
    const novaPrevisao = previsaoNova || equipamento.previsao_saida || "";
    const observacaoHistorico = dataParadoNovo
      ? anexarDataParadaAoTexto(novaObservacao, dataParadoNovo)
      : novaObservacao;

    const dadosUpdate = {
      observacao: novaObservacao,
      numero_os: novaOS,
      previsao_saida: novaPrevisao,
      updated_at: obterAgoraISO()
    };

    if (dataParadoNovo) {
      dadosUpdate.data_parado = dataParadoNovo;
    }

    const { error } = await supabaseClient
      .from("equipamentos")
      .update(dadosUpdate)
      .eq("frota", frota);

    if (error) {
      console.error("Erro ao confirmar alteração:", error);
      respostaChat.innerText = "Erro ao confirmar alteração.";
      return;
    }

    await supabaseClient
      .from("historico_movimentacoes")
      .insert({
        frota,
        acao: acaoHistorico,
        status_anterior: "PENDENTE",
        status_novo: "PENDENTE",
        observacao_anterior: equipamento.observacao || "",
        observacao_nova: observacaoHistorico,
        numero_os: novaOS,
        previsao_saida: novaPrevisao,
        mensagem_original: `Confirmação: ${tipoConfirmacao} motivo para ${motivoNovo}`
      });

    respostaChat.innerText =
      `Alteração confirmada para ${nomeSingular} ${frota}.\n\n` +
      `Novo motivo: ${novaObservacao}\n` +
      `O.S: ${novaOS || "Não informada"}\n` +
      `Previsão: ${novaPrevisao || "Sem previsão"}\n` +
      `Parada: ${dataParadoNovo ? formatarDataHora(dataParadoNovo) : formatarDataHora(equipamento.data_parado)}`;

    confirmacaoPendente = null;

    await carregarEquipamentos();
    await carregarHistorico();
    await gerarRelatorio();

  } catch (erro) {
    respostaChat.innerText = "Erro ao confirmar alteração.";
    console.error(erro);
  }
}

async function carregarHistorico() {
  try {
    const { data, error } = await supabaseClient
      .from("historico_movimentacoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar histórico:", error);
      alert("Erro ao carregar histórico.");
      return;
    }

    historicoCarregado = data || [];

    const tbody = document.getElementById("tabela-historico");

    if (!tbody) {
      console.warn("Tabela de histórico não encontrada no HTML.");
      return;
    }

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">Nenhuma movimentação registrada ainda.</td>
        </tr>
      `;
      atualizarDisponibilidadeDia();
      return;
    }

    data.forEach(item => {
      const tr = document.createElement("tr");

      const dataMovimentacao = item.created_at
        ? formatarDataHora(item.created_at)
        : "-";

      tr.innerHTML = `
        <td>${dataMovimentacao}</td>
        <td><strong>${textoSeguro(item.frota || "-")}</strong></td>
        <td>${textoSeguro(item.acao || "-")}</td>
        <td>${textoSeguro(item.status_anterior || "-")}</td>
        <td>${textoSeguro(item.status_novo || "-")}</td>
        <td>${textoSeguro(item.observacao_anterior || "-")}</td>
        <td>${textoSeguro(item.observacao_nova || "-")}</td>
        <td>${textoSeguro(item.numero_os || "-")}</td>
        <td>${textoSeguro(item.previsao_saida || "-")}</td>
      `;

      tbody.appendChild(tr);
    });

    atualizarDisponibilidadeDia();

  } catch (erro) {
    alert("Erro ao carregar histórico.");
    console.error(erro);
  }
}

async function cadastrarEquipamento() {
  const frota = document.getElementById("cad-frota").value.trim();
  const tipo = document.getElementById("cad-tipo").value.trim();
  const placa = document.getElementById("cad-placa").value.trim();
  const conjunto = document.getElementById("cad-conjunto").value.trim();
  const tipo_conjunto = document.getElementById("cad-tipo-conjunto").value;
  const status = document.getElementById("cad-status").value;
  const observacao = document.getElementById("cad-observacao").value.trim();
  const numero_os = document.getElementById("cad-os").value.trim();
  const previsao_saida = document.getElementById("cad-previsao").value.trim();
  const tipoFinal = tipo || obterConfiguracaoAba().tipoPadrao;
  const dataParado = obterDataParadoParaStatus(status, "cad-data-parado");

  if (!frota) {
    alert("Informe a frota.");
    return;
  }

  try {
    const { data: existente, error: erroBusca } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("frota", frota)
      .maybeSingle();

    if (erroBusca) {
      console.error("Erro ao verificar frota:", erroBusca);
      alert("Erro ao verificar se a frota já existe.");
      return;
    }

    if (existente) {
      alert(`Já existe um equipamento cadastrado com a frota ${frota}.`);
      return;
    }

    const { error } = await supabaseClient
      .from("equipamentos")
      .insert({
        frota,
        tipo: tipoFinal,
        placa: placa || "",
        conjunto: conjunto || "",
        tipo_conjunto: tipo_conjunto || "INDIVIDUAL",
        status: status || "OK",
        observacao: observacao || "",
        numero_os: numero_os || "",
        data_parado: dataParado,
        previsao_saida: previsao_saida || "",
        ativo: true
      });

    if (error) {
      console.error("Erro ao cadastrar equipamento:", error);
      alert("Erro ao cadastrar equipamento.");
      return;
    }

    await supabaseClient
      .from("historico_movimentacoes")
      .insert({
        frota,
        acao: "CADASTROU_EQUIPAMENTO",
        status_anterior: "",
        status_novo: status || "OK",
        observacao_anterior: "",
        observacao_nova: anexarDataParadaAoTexto(observacao || "Equipamento cadastrado", dataParado),
        numero_os: numero_os || "",
        previsao_saida: previsao_saida || "",
        mensagem_original: `Equipamento ${frota} cadastrado manualmente`
      });

    alert(`Equipamento ${frota} cadastrado com sucesso.`);

    limparFormularioEquipamento();

    await carregarEquipamentos();
    await carregarHistorico();
    await gerarRelatorio();

  } catch (erro) {
    alert("Erro ao cadastrar equipamento.");
    console.error(erro);
  }
}

async function cadastrarFrente() {
  const frota = document.getElementById("frente-codigo").value.trim();
  const status = document.getElementById("frente-status").value;
  const observacao = document.getElementById("frente-observacao").value.trim();

  if (!frota) {
    alert("Informe o nome ou código da frente.");
    return;
  }

  try {
    const { data: existente, error: erroBusca } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("frota", frota)
      .maybeSingle();

    if (erroBusca) {
      console.error("Erro ao verificar frente:", erroBusca);
      alert("Erro ao verificar se a frente já existe.");
      return;
    }

    if (existente) {
      alert(`Já existe um item cadastrado com a frota/frente ${frota}.`);
      return;
    }

    const { error } = await supabaseClient
      .from("equipamentos")
      .insert({
        frota,
        tipo: "Frente de Colheita",
        placa: "",
        conjunto: "",
        tipo_conjunto: "INDIVIDUAL",
        status: status || "OK",
        observacao: observacao || "",
        numero_os: "",
        data_parado: status === "PENDENTE" ? obterAgoraISO() : "",
        previsao_saida: "",
        ativo: true
      });

    if (error) {
      console.error("Erro ao cadastrar frente:", error);
      alert("Erro ao cadastrar frente.");
      return;
    }

    await supabaseClient
      .from("historico_movimentacoes")
      .insert({
        frota,
        acao: "CADASTROU_FRENTE",
        status_anterior: "",
        status_novo: status || "OK",
        observacao_anterior: "",
        observacao_nova: observacao || "Frente cadastrada",
        numero_os: "",
        previsao_saida: "",
        mensagem_original: `Frente ${frota} cadastrada manualmente`
      });

    document.getElementById("frente-codigo").value = "";
    document.getElementById("frente-status").value = "OK";
    document.getElementById("frente-observacao").value = "";

    alert(`Frente ${frota} cadastrada com sucesso.`);

    await carregarEquipamentos();
    await carregarHistorico();
    await gerarRelatorio();

  } catch (erro) {
    alert("Erro ao cadastrar frente.");
    console.error(erro);
  }
}

async function cadastrarEquipamentoNaFrente() {
  const frente = document.getElementById("vinculo-frente").value;
  const tipo = document.getElementById("vinculo-tipo").value;
  const frota = document.getElementById("vinculo-frota").value.trim();
  const placa = document.getElementById("vinculo-placa").value.trim();
  const status = document.getElementById("vinculo-status").value;
  const observacao = document.getElementById("vinculo-observacao").value.trim();
  const dataParado = obterDataParadoParaStatus(status, "vinculo-data-parado");

  if (!frente) {
    alert("Selecione a frente.");
    return;
  }

  if (!frota) {
    alert("Informe a frota.");
    return;
  }

  try {
    const { data: existente, error: erroBusca } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("frota", frota)
      .maybeSingle();

    if (erroBusca) {
      console.error("Erro ao verificar equipamento:", erroBusca);
      alert("Erro ao verificar se a frota já existe.");
      return;
    }

    if (existente) {
      alert(`Já existe um equipamento cadastrado com a frota ${frota}.`);
      return;
    }

    const { error } = await supabaseClient
      .from("equipamentos")
      .insert({
        frota,
        tipo,
        placa: placa || "",
        conjunto: frente,
        tipo_conjunto: "CONJUNTO",
        status: status || "OK",
        observacao: observacao || "",
        numero_os: "",
        data_parado: dataParado,
        previsao_saida: "",
        ativo: true
      });

    if (error) {
      console.error("Erro ao adicionar equipamento na frente:", error);
      alert("Erro ao adicionar equipamento na frente.");
      return;
    }

    await supabaseClient
      .from("historico_movimentacoes")
      .insert({
        frota,
        acao: "CADASTROU_EQUIPAMENTO_NA_FRENTE",
        status_anterior: "",
        status_novo: status || "OK",
        observacao_anterior: "",
        observacao_nova: anexarDataParadaAoTexto(
          observacao || `${tipo} cadastrado na frente ${frente}`,
          dataParado
        ),
        numero_os: "",
        previsao_saida: "",
        mensagem_original: `${tipo} ${frota} cadastrado na frente ${frente}`
      });

    document.getElementById("vinculo-frota").value = "";
    document.getElementById("vinculo-placa").value = "";
    document.getElementById("vinculo-status").value = "OK";
    document.getElementById("vinculo-data-parado").value = "";
    document.getElementById("vinculo-observacao").value = "";

    alert(`${tipo} ${frota} adicionado na frente ${frente}.`);

    await carregarEquipamentos();
    await carregarHistorico();
    await gerarRelatorio();

  } catch (erro) {
    alert("Erro ao adicionar equipamento na frente.");
    console.error(erro);
  }
}

async function excluirEquipamento(frota) {
  const confirmacao = prompt(
    `ATENÇÃO!\n\nVocê está prestes a excluir definitivamente o equipamento ${frota}.\n\nDigite EXCLUIR para confirmar.`
  );

  if (confirmacao !== "EXCLUIR") {
    alert("Exclusão cancelada.");
    return;
  }

  try {
    const { data: equipamento, error: erroBusca } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("frota", frota)
      .maybeSingle();

    if (erroBusca || !equipamento) {
      console.error("Erro ao buscar equipamento:", erroBusca);
      alert("Equipamento não encontrado.");
      return;
    }

    await supabaseClient
      .from("historico_movimentacoes")
      .insert({
        frota,
        acao: "EXCLUIU_EQUIPAMENTO",
        status_anterior: equipamento.status || "",
        status_novo: "EXCLUÍDO",
        observacao_anterior: equipamento.observacao || "",
        observacao_nova: "Equipamento excluído definitivamente",
        numero_os: equipamento.numero_os || "",
        previsao_saida: equipamento.previsao_saida || "",
        mensagem_original: `Equipamento ${frota} excluído manualmente`
      });

    const { error } = await supabaseClient
      .from("equipamentos")
      .delete()
      .eq("frota", frota);

    if (error) {
      console.error("Erro ao excluir equipamento:", error);
      alert("Erro ao excluir equipamento.");
      return;
    }

    alert(`Equipamento ${frota} excluído com sucesso.`);

    await carregarEquipamentos();
    await carregarHistorico();
    await gerarRelatorio();

  } catch (erro) {
    alert("Erro ao excluir equipamento.");
    console.error(erro);
  }
}

function editarEquipamento(equipamento) {

    const cadastroBox = document.getElementById("cadastro-box");
const botaoCadastro = document.getElementById("btn-toggle-cadastro");

if (cadastroBox) {
  cadastroBox.style.display = "block";
}

if (botaoCadastro) {
  botaoCadastro.innerText = "- Fechar Cadastro";
}
  frotaEmEdicao = equipamento.frota;

  document.getElementById("cad-frota").value = equipamento.frota || "";
  selecionarTipoNoCadastro(equipamento.tipo || obterConfiguracaoAba(obterAbaDoEquipamento(equipamento)).tipoPadrao);
  document.getElementById("cad-placa").value = equipamento.placa || "";
  document.getElementById("cad-conjunto").value = equipamento.conjunto || "";
  document.getElementById("cad-tipo-conjunto").value = equipamento.tipo_conjunto || "INDIVIDUAL";
  document.getElementById("cad-status").value = equipamento.status || "OK";
  document.getElementById("cad-data-parado").value = formatarParaDatetimeLocal(equipamento.data_parado);
  document.getElementById("cad-observacao").value = equipamento.observacao || "";
  document.getElementById("cad-os").value = equipamento.numero_os || "";
  document.getElementById("cad-previsao").value = equipamento.previsao_saida || "";

  document.getElementById("btn-cadastrar").style.display = "none";
  document.getElementById("btn-salvar-edicao").style.display = "inline-block";
  document.getElementById("btn-cancelar-edicao").style.display = "inline-block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function cancelarEdicao() {
  frotaEmEdicao = null;

  limparFormularioEquipamento();

  document.getElementById("btn-cadastrar").style.display = "inline-block";
  document.getElementById("btn-salvar-edicao").style.display = "none";
  document.getElementById("btn-cancelar-edicao").style.display = "none";
}

function limparFormularioEquipamento() {
  document.getElementById("cad-frota").value = "";
  selecionarTipoNoCadastro(obterConfiguracaoAba().tipoPadrao);
  document.getElementById("cad-placa").value = "";
  document.getElementById("cad-conjunto").value = "";
  document.getElementById("cad-tipo-conjunto").value = "INDIVIDUAL";
  document.getElementById("cad-status").value = "OK";
  document.getElementById("cad-data-parado").value = "";
  document.getElementById("cad-observacao").value = "";
  document.getElementById("cad-os").value = "";
  document.getElementById("cad-previsao").value = "";
}

async function salvarEdicaoEquipamento() {
  if (!frotaEmEdicao) {
    alert("Nenhum equipamento está em edição.");
    return;
  }

  const nova_frota = document.getElementById("cad-frota").value.trim();
  const tipo = document.getElementById("cad-tipo").value.trim();
  const placa = document.getElementById("cad-placa").value.trim();
  const conjunto = document.getElementById("cad-conjunto").value.trim();
  const tipo_conjunto = document.getElementById("cad-tipo-conjunto").value;
  const status = document.getElementById("cad-status").value;
  const observacao = document.getElementById("cad-observacao").value.trim();
  const numero_os = document.getElementById("cad-os").value.trim();
  const previsao_saida = document.getElementById("cad-previsao").value.trim();
  const tipoFinal = tipo || obterConfiguracaoAba().tipoPadrao;
  const dataParadoInformada = obterDataHoraInputComoISO("cad-data-parado");

  if (!nova_frota) {
    alert("Informe a frota.");
    return;
  }

  try {
    const { data: equipamentoAtual, error: erroBusca } = await supabaseClient
      .from("equipamentos")
      .select("*")
      .eq("frota", frotaEmEdicao)
      .maybeSingle();

    if (erroBusca || !equipamentoAtual) {
      console.error("Erro ao buscar equipamento:", erroBusca);
      alert("Equipamento não encontrado.");
      return;
    }

    if (nova_frota !== frotaEmEdicao) {
      const { data: frotaExistente, error: erroFrota } = await supabaseClient
        .from("equipamentos")
        .select("*")
        .eq("frota", nova_frota)
        .maybeSingle();

      if (erroFrota) {
        console.error("Erro ao verificar nova frota:", erroFrota);
        alert("Erro ao verificar se a nova frota já existe.");
        return;
      }

      if (frotaExistente) {
        alert(`Já existe outro equipamento cadastrado com a frota ${nova_frota}.`);
        return;
      }
    }

    const dadosEdicao = {
      frota: nova_frota,
      tipo: tipoFinal,
      placa: placa || "",
      conjunto: conjunto || "",
      tipo_conjunto: tipo_conjunto || "INDIVIDUAL",
      status: status || "OK",
      observacao: observacao || "",
      numero_os: numero_os || "",
      previsao_saida: previsao_saida || "",
      updated_at: obterAgoraISO()
    };

    let observacaoHistorico = observacao || "";

    if (status === "PENDENTE") {
      dadosEdicao.data_parado = dataParadoInformada || equipamentoAtual.data_parado || obterAgoraISO();

      if (equipamentoAtual.status !== "PENDENTE") {
        observacaoHistorico = observacaoHistorico || `Parado em ${formatarDataHora(dadosEdicao.data_parado)}`;
      }

      if (
        equipamentoAtual.status === "PENDENTE" &&
        dataParadoInformada &&
        dataParadoInformada !== equipamentoAtual.data_parado
      ) {
        observacaoHistorico = observacaoHistorico ||
          `Ajustou parada para ${formatarDataHora(dataParadoInformada)}`;
      }

      observacaoHistorico = anexarDataParadaAoTexto(observacaoHistorico, dadosEdicao.data_parado);
    }

    if (status === "OK") {
      const equipamentoParaLiberacao = dataParadoInformada
        ? { ...equipamentoAtual, data_parado: dataParadoInformada }
        : equipamentoAtual;
      const resumoLiberacao = equipamentoAtual.status === "PENDENTE"
        ? obterResumoLiberacao(equipamentoParaLiberacao, new Date())
        : null;

      dadosEdicao.data_parado = "";

      if (resumoLiberacao) {
        observacaoHistorico = observacaoHistorico || resumoLiberacao.texto;
      }
    }

    const { error } = await supabaseClient
      .from("equipamentos")
      .update(dadosEdicao)
      .eq("frota", frotaEmEdicao);

    if (error) {
      console.error("Erro ao editar equipamento:", error);
      alert("Erro ao editar equipamento.");
      return;
    }

    await supabaseClient
      .from("historico_movimentacoes")
      .insert({
        frota: nova_frota,
        acao: "EDITOU_EQUIPAMENTO",
        status_anterior: equipamentoAtual.status || "",
        status_novo: status || "",
        observacao_anterior: equipamentoAtual.observacao || "",
        observacao_nova: observacaoHistorico || "",
        numero_os: numero_os || "",
        previsao_saida: previsao_saida || "",
        mensagem_original: `Equipamento ${frotaEmEdicao} editado manualmente`
      });

    alert(`Equipamento ${nova_frota} editado com sucesso.`);

    cancelarEdicao();

    await carregarEquipamentos();
    await carregarHistorico();
    await gerarRelatorio();

  } catch (erro) {
    alert("Erro ao editar equipamento.");
    console.error(erro);
  }
}

function renderizarGraficoStatus(equipamentos) {
  const ok = equipamentos.filter(e => e.status === "OK").length;
  const pendentes = equipamentos.filter(e => e.status === "PENDENTE").length;
  const total = equipamentos.length;

  const percentualOk = total > 0 ? ((ok / total) * 100).toFixed(1) : 0;
  const percentualPendente = total > 0 ? ((pendentes / total) * 100).toFixed(1) : 0;

  const percentualOkTexto = document.getElementById("percentual-ok");
  const percentualPendenteTexto = document.getElementById("percentual-pendente");
  const descricao = obterDescricaoAcaoAtual();

  if (percentualOkTexto) {
    percentualOkTexto.innerText = `OK: ${ok} ${descricao.plural} - ${percentualOk}%`;
  }

  if (percentualPendenteTexto) {
    percentualPendenteTexto.innerText = `Pendentes: ${pendentes} ${descricao.plural} - ${percentualPendente}%`;
  }

  const canvas = document.getElementById("graficoStatus");

  if (!canvas) {
    console.warn("Canvas do gráfico não encontrado.");
    return;
  }

  const ctx = canvas.getContext("2d");

  if (graficoStatus) {
    graficoStatus.destroy();
  }

  graficoStatus = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["OK", "Pendentes"],
      datasets: [
        {
          data: [ok, pendentes],
          backgroundColor: ["#22c55e", "#ef4444"],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const totalGrafico = context.dataset.data.reduce((a, b) => a + b, 0);
              const valor = context.raw;
              const percentual = totalGrafico > 0 ? ((valor / totalGrafico) * 100).toFixed(1) : 0;

              return `${context.label}: ${valor} (${percentual}%)`;
            }
          }
        }
      }
    }
  });
}

async function processarAlteracaoRapida({
  equipamento,
  frota,
  mensagem,
  querRemoverPrevisao,
  matchPrevisaoRapida,
  matchOSRapida,
  respostaChat
}) {
  let dadosUpdate = {
    updated_at: obterAgoraISO()
  };

  let acaoHistorico = "";
  let resposta = "";
  const nomeSingular = obterNomeSingular(equipamento);

  if (querRemoverPrevisao) {
    dadosUpdate.previsao_saida = "";
    acaoHistorico = "REMOVEU_PREVISAO";

    resposta =
      `Previsão de ${nomeSingular} ${frota} removida com sucesso.\n\n` +
      `Previsão anterior: ${equipamento.previsao_saida || "Sem previsão"}`;
  }

  if (matchPrevisaoRapida && !querRemoverPrevisao) {
    const novaPrevisao = matchPrevisaoRapida[1].trim();

    if (!novaPrevisao) {
      respostaChat.innerText = "Informe a nova previsão. Exemplo: 6242 previsão amanhã 08h";
      return;
    }

    dadosUpdate.previsao_saida = novaPrevisao;
    acaoHistorico = "ALTEROU_PREVISAO";

    resposta =
      `Previsão de ${nomeSingular} ${frota} alterada com sucesso.\n\n` +
      `Previsão anterior: ${equipamento.previsao_saida || "Sem previsão"}\n` +
      `Nova previsão: ${novaPrevisao}`;
  }

  if (matchOSRapida) {
    const novaOS = matchOSRapida[1];

    dadosUpdate.numero_os = novaOS;

    if (acaoHistorico) {
      acaoHistorico = `${acaoHistorico}_E_OS`;
    } else {
      acaoHistorico = "ALTEROU_OS";
    }

    resposta =
      `O.S de ${nomeSingular} ${frota} alterada com sucesso.\n\n` +
      `O.S anterior: ${equipamento.numero_os || "Não informada"}\n` +
      `Nova O.S: ${novaOS}`;

    if (dadosUpdate.previsao_saida !== undefined) {
      resposta += `\nPrevisão atualizada: ${dadosUpdate.previsao_saida || "Sem previsão"}`;
    }
  }

  const { error } = await supabaseClient
    .from("equipamentos")
    .update(dadosUpdate)
    .eq("frota", frota);

  if (error) {
    console.error("Erro na alteração rápida:", error);
    respostaChat.innerText = "Erro ao realizar alteração rápida.";
    return;
  }

  await supabaseClient
    .from("historico_movimentacoes")
    .insert({
      frota,
      acao: acaoHistorico,
      status_anterior: equipamento.status || "",
      status_novo: equipamento.status || "",
      observacao_anterior: equipamento.observacao || "",
      observacao_nova: equipamento.observacao || "",
      numero_os: dadosUpdate.numero_os || equipamento.numero_os || "",
      previsao_saida:
        dadosUpdate.previsao_saida !== undefined
          ? dadosUpdate.previsao_saida
          : equipamento.previsao_saida || "",
      mensagem_original: mensagem
    });

  respostaChat.innerText = resposta;

  await carregarEquipamentos();
  await carregarHistorico();
  await gerarRelatorio();
}

async function liberarReboquePeloChat(equipamento, frota, mensagem, respostaChat) {
  const nomeSingular = obterNomeSingular(equipamento);
  const retornoInformado = extrairDataHoraParadaDaMensagem(mensagem);
  const retorno = retornoInformado ? parseDataHora(retornoInformado.iso) : new Date();
  const resumoLiberacao = obterResumoLiberacao(equipamento, retorno);

  if (equipamento.status === "OK") {
    respostaChat.innerText = `${capitalizar(nomeSingular)} ${frota} já está OK. Nenhuma alteração foi feita.`;
    return;
  }

  const { error } = await supabaseClient
    .from("equipamentos")
    .update({
      status: "OK",
      observacao: "Liberado",
      numero_os: "",
      data_parado: "",
      previsao_saida: "",
      updated_at: retorno.toISOString()
    })
    .eq("frota", frota);

  if (error) {
    console.error("Erro ao liberar equipamento:", error);
    respostaChat.innerText = "Erro ao liberar equipamento.";
    return;
  }

  await supabaseClient
    .from("historico_movimentacoes")
    .insert({
      frota,
      acao: "LIBERADO",
      status_anterior: equipamento.status || "",
      status_novo: "OK",
      observacao_anterior: equipamento.observacao || "",
      observacao_nova: resumoLiberacao.texto,
      numero_os: equipamento.numero_os || "",
      previsao_saida: "",
      mensagem_original: mensagem
    });

  respostaChat.innerText =
    `${capitalizar(nomeSingular)} ${frota} liberado com sucesso.\n\n` +
    `Status anterior: ${equipamento.status}\n` +
    `Motivo anterior: ${equipamento.observacao || "Sem observação"}\n` +
    `Parada: ${resumoLiberacao.parada ? formatarDataHora(resumoLiberacao.parada) : "Não registrada"}\n` +
    `Início: ${formatarDataHora(retorno)}${retornoInformado ? " (informado no agente)" : ""}\n` +
    `Tempo parado: ${formatarDuracao(resumoLiberacao.tempoMs)}`;

  await carregarEquipamentos();
  await carregarHistorico();
  await gerarRelatorio();
}

async function pararReboquePeloChat(equipamento, frota, mensagem, respostaChat) {
  let motivo = mensagem;
  const nomeSingular = obterNomeSingular(equipamento);
  const paradaInformada = extrairDataHoraParadaDaMensagem(mensagem);

  if (paradaInformada) {
    motivo = limparTrechoDataParada(motivo, paradaInformada.textoEncontrado);
  }

  motivo = motivo.replace(new RegExp(frota, "g"), "");
  motivo = motivo.replace(/reboque|frente de colheita|frente|colhedora|transbordo|caminh[aã]o pr[oó]prio|caminh[aã]o/gi, "");
  motivo = motivo.replace(/parado/gi, "");
  motivo = motivo.replace(/pendente/gi, "");
  motivo = motivo.replace(/manutenção/gi, "");
  motivo = motivo.replace(/manutencao/gi, "");
  motivo = motivo.replace(/oficina/gi, "");
  motivo = motivo.trim();

  const osMatch = mensagem.match(/(?:os|o\.s|o\.s\.|ordem)\s*[:\-]?\s*(\d+)/i);
  const numeroOS = osMatch ? osMatch[1] : "";

  let previsao = "";

  const previsaoMatch = mensagem.match(/previs[aã]o\s*(?:para|pra|:|-)?\s*([\s\S]*?)(?=\s+(?:os|o\.s|o\.s\.|ordem)\b|$)/i);
  if (previsaoMatch) {
    previsao = previsaoMatch[1].trim();
    motivo = motivo.replace(previsaoMatch[0], "").trim();
  }

  if (osMatch) {
    motivo = motivo.replace(osMatch[0], "").trim();
  }

  if (!motivo) {
    motivo = "Motivo não informado";
  }

  const dataParado = paradaInformada?.iso || obterAgoraISO();

  if (equipamento.status === "PENDENTE") {
    confirmacaoPendente = {
      frota,
      motivoNovo: motivo,
      numeroOSNovo: numeroOS,
      previsaoNova: previsao,
      dataParadoNovo: paradaInformada?.iso || ""
    };

    const paradaTexto = paradaInformada
      ? `<br>Nova parada informada: ${formatarDataHora(paradaInformada.iso)}`
      : "";

    respostaChat.innerHTML = `
      <div>
        Atenção: ${nomeSingular} ${frota} já está PENDENTE.<br><br>
        Motivo atual: ${equipamento.observacao || "Sem observação"}<br>
        O.S atual: ${equipamento.numero_os || "Não informada"}<br>
        Parada atual: ${equipamento.data_parado ? formatarDataHora(equipamento.data_parado) : "Não registrada"}<br>
        Previsão atual: ${equipamento.previsao_saida || "Sem previsão"}<br><br>
        Novo motivo informado: ${motivo}${paradaTexto}<br><br>
        O problema antigo já foi solucionado?
      </div>
      <div class="confirmacao-acoes">
        <button onclick="confirmarAlteracao('substituir')">Substituir motivo</button>
        <button class="btn-secondary" onclick="confirmarAlteracao('adicionar')">Adicionar novo problema</button>
        <button class="btn-secondary" onclick="confirmarAlteracao('cancelar')">Cancelar</button>
      </div>
    `;

    return;
  }

  const { error } = await supabaseClient
    .from("equipamentos")
    .update({
      status: "PENDENTE",
      observacao: motivo,
      numero_os: numeroOS,
      data_parado: dataParado,
      previsao_saida: previsao,
      updated_at: dataParado
    })
    .eq("frota", frota);

  if (error) {
    console.error("Erro ao parar equipamento:", error);
    respostaChat.innerText = "Erro ao atualizar equipamento como pendente.";
    return;
  }

  await supabaseClient
    .from("historico_movimentacoes")
    .insert({
      frota,
      acao: "PARADO",
      status_anterior: equipamento.status || "",
      status_novo: "PENDENTE",
      observacao_anterior: equipamento.observacao || "",
      observacao_nova: anexarDataParadaAoTexto(motivo, dataParado),
      numero_os: numeroOS,
      previsao_saida: previsao,
      mensagem_original: mensagem
    });

  respostaChat.innerText =
    `${capitalizar(nomeSingular)} ${frota} atualizado como PENDENTE.\n\n` +
    `Motivo: ${motivo}\n` +
    `Parada: ${formatarDataHora(dataParado)}${paradaInformada ? " (informada no agente)" : ""}\n` +
    `O.S: ${numeroOS || "Não informada"}\n` +
    `Previsão: ${previsao || "Sem previsão"}`;

  await carregarEquipamentos();
  await carregarHistorico();
  await gerarRelatorio();
}

function toggleCadastro() {
  const cadastroBox = document.getElementById("cadastro-box");
  const botao = document.getElementById("btn-toggle-cadastro");

  if (!cadastroBox || !botao) {
    return;
  }

  const estaEscondido = cadastroBox.style.display === "none";

  if (estaEscondido) {
    cadastroBox.style.display = "block";
    botao.innerText = "- Fechar Cadastro";
  } else {
    cadastroBox.style.display = "none";
    botao.innerText = "+ Cadastrar Equipamento";
    cancelarEdicao();
  }
}

function alternarTema() {
  document.body.classList.toggle("dark-mode");

  const temaAtual = document.body.classList.contains("dark-mode")
    ? "escuro"
    : "claro";

  localStorage.setItem("tema", temaAtual);
}

function carregarTemaSalvo() {
  const temaSalvo = localStorage.getItem("tema");

  if (temaSalvo === "escuro") {
    document.body.classList.add("dark-mode");
  }
}

function extrairListaPendentes(mensagem) {
  const texto = mensagem
    .replace(/\r/g, "")
    .replace(/[–—]/g, "-");

  const codigoFrota = "[A-Za-zÀ-ÿ]{0,4}\\s*-?\\s*\\d{2,}[A-Za-z0-9À-ÿ.-]*|\\d{3,}[A-Za-z0-9À-ÿ.-]*";
  const regex = new RegExp(`🛑?\\s*(${codigoFrota})\\s+-\\s+([\\s\\S]*?)(?=🛑?\\s*(?:${codigoFrota})\\s+-\\s+|$)`, "g");

  const itens = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const frota = match[1].replace(/\s+/g, "");
    const bloco = match[2].trim();

    const osMatch = bloco.match(/(?:📋)?\s*(?:OS|O\.S|O\.S\.)\s*[:\-]?\s*(\d+)/i);
    const previsaoMatch = bloco.match(/(?:⏰)?\s*previs[aã]o\s*(?:para|pra|:|-)?\s*([^\n🛑]*?)(?=\s+(?:OS|O\.S|O\.S\.|ordem)\b|\n|🛑|$)/i);
    const paradaInformada = extrairDataHoraParadaDaMensagem(bloco);

    let motivo = bloco;

    if (paradaInformada) {
      motivo = limparTrechoDataParada(motivo, paradaInformada.textoEncontrado);
    }

    if (osMatch) {
      motivo = motivo.replace(osMatch[0], "");
    }

    if (previsaoMatch) {
      motivo = motivo.replace(previsaoMatch[0], "");
    }

    motivo = motivo
      .replace(/📋/g, "")
      .replace(/⏰/g, "")
      .replace(/\s+/g, " ")
      .trim();

    itens.push({
      frota,
      motivo: motivo || "Motivo não informado",
      numero_os: osMatch ? osMatch[1] : "",
      previsao_saida: previsaoMatch ? previsaoMatch[1].trim() : "",
      data_parado: paradaInformada?.iso || ""
    });
  }

  return itens;
}

async function processarListaDePendentes(mensagem, respostaChat) {
  const itens = extrairListaPendentes(mensagem);
  const config = obterConfiguracaoAba();
  iniciarProgresso(itens.length);

  if (itens.length === 0) {
    respostaChat.innerText = `Não consegui identificar a lista de ${config.plural} pendentes.`;
    return;
  }

  let cadastrados = 0;
  let atualizados = 0;
  let erros = [];

 for (let i = 0; i < itens.length; i++) {
  const item = itens[i];
    const dataParadoItem = item.data_parado || obterAgoraISO();

    try {
      const { data: equipamentoExistente, error: erroBusca } = await supabaseClient
        .from("equipamentos")
        .select("*")
        .eq("frota", item.frota)
        .maybeSingle();

      if (erroBusca) {
        erros.push(`${item.frota}: erro ao buscar`);
        continue;
      }

      if (!equipamentoExistente) {
        let tipoCadastro = config.tipoPadrao;
        let conjuntoCadastro = "";
        let tipoConjuntoCadastro = "INDIVIDUAL";

        if (abaAtual === "FRENTES") {
          const frenteSelecionada = document.getElementById("vinculo-frente")?.value || "";
          const tipoSelecionado = document.getElementById("vinculo-tipo")?.value || "Colhedora";

          if (!frenteSelecionada) {
            erros.push(`${item.frota}: selecione uma frente para cadastrar pela lista`);
            continue;
          }

          tipoCadastro = tipoSelecionado;
          conjuntoCadastro = frenteSelecionada;
          tipoConjuntoCadastro = "CONJUNTO";
        }

        const { error: erroInsert } = await supabaseClient
          .from("equipamentos")
          .insert({
            frota: item.frota,
            tipo: tipoCadastro,
            placa: "",
            conjunto: conjuntoCadastro,
            tipo_conjunto: tipoConjuntoCadastro,
            status: "PENDENTE",
            observacao: item.motivo,
            numero_os: item.numero_os,
            data_parado: dataParadoItem,
            previsao_saida: item.previsao_saida,
            ativo: true
          });

        if (erroInsert) {
          erros.push(`${item.frota}: erro ao cadastrar`);
          continue;
        }

        await supabaseClient
          .from("historico_movimentacoes")
          .insert({
            frota: item.frota,
            acao: "CADASTROU_E_PAROU_LISTA",
            status_anterior: "",
            status_novo: "PENDENTE",
            observacao_anterior: "",
            observacao_nova: anexarDataParadaAoTexto(item.motivo, dataParadoItem),
            numero_os: item.numero_os,
            previsao_saida: item.previsao_saida,
            mensagem_original: "Importado por lista de pendentes"
          });

        cadastrados++;
        continue;
      }

      const { error: erroUpdate } = await supabaseClient
        .from("equipamentos")
        .update({
          status: "PENDENTE",
          observacao: item.motivo,
          numero_os: item.numero_os,
          previsao_saida: item.previsao_saida,
          data_parado: item.data_parado || equipamentoExistente.data_parado || obterAgoraISO(),
          ativo: true,
          updated_at: obterAgoraISO()
        })
        .eq("frota", item.frota);

      if (erroUpdate) {
        erros.push(`${item.frota}: erro ao atualizar`);
        continue;
      }

      await supabaseClient
        .from("historico_movimentacoes")
        .insert({
          frota: item.frota,
          acao: "ATUALIZOU_POR_LISTA",
          status_anterior: equipamentoExistente.status || "",
          status_novo: "PENDENTE",
          observacao_anterior: equipamentoExistente.observacao || "",
          observacao_nova: anexarDataParadaAoTexto(
            item.motivo,
            item.data_parado || equipamentoExistente.data_parado || obterAgoraISO()
          ),
          numero_os: item.numero_os,
          previsao_saida: item.previsao_saida,
          mensagem_original: "Atualizado por lista de pendentes"
        });

      atualizados++;

    } catch (erro) {
      console.error(erro);
      erros.push(`${item.frota}: erro inesperado`);
    }

    atualizarProgresso(i + 1, itens.length);
  }

  respostaChat.innerText =
    `Lista processada com sucesso.\n\n` +
    `Itens identificados: ${itens.length}\n` +
    `Atualizados: ${atualizados}\n` +
    `Cadastrados automaticamente: ${cadastrados}\n` +
    `Erros: ${erros.length}${erros.length ? "\n\n" + erros.join("\n") : ""}`;

  await carregarEquipamentos();
  await carregarHistorico();
  await gerarRelatorio();
  finalizarProgresso();
}

async function confirmarAcaoEmMassa(acao) {
  const respostaChat = document.getElementById("resposta-chat");
  const descricaoAcao = obterDescricaoAcaoAtual();

  if (!confirmacaoMassa) {
    respostaChat.innerText = "Não existe ação em massa pendente.";
    return;
  }

  if (acao === "cancelar") {
    confirmacaoMassa = null;
    respostaChat.innerText = "Ação em massa cancelada.";
    return;
  }

  if (confirmacaoMassa.tipo === "liberar_todos") {
    try {
      const { data: pendentes, error: erroBusca } = await supabaseClient
        .from("equipamentos")
        .select("*")
        .eq("ativo", true)
        .eq("status", "PENDENTE");

      if (erroBusca) {
        console.error("Erro ao buscar pendentes:", erroBusca);
        respostaChat.innerText = `Erro ao buscar ${descricaoAcao.plural} pendentes.`;
        return;
      }

      let pendentesDaAba = obterEquipamentosParaAcaoNaAba(pendentes || []);
      const frenteAlvo = confirmacaoMassa.frente || "";

      if (frenteAlvo) {
        pendentesDaAba = pendentesDaAba.filter(equipamento =>
          equipamentoPertenceFrenteTexto(equipamento, frenteAlvo)
        );
      }

      const alvoMensagem = frenteAlvo
        ? ` da frente ${frenteAlvo}`
        : " nesta aba";

      if (!pendentesDaAba || pendentesDaAba.length === 0) {
        respostaChat.innerText = `Nenhum ${descricaoAcao.singular} pendente para liberar${alvoMensagem}.`;
        confirmacaoMassa = null;
        return;
      }

      const frotas = pendentesDaAba.map(e => e.frota);
      const retorno = new Date();

      const { error: erroUpdate } = await supabaseClient
        .from("equipamentos")
        .update({
          status: "OK",
          observacao: "Liberado",
          numero_os: "",
          data_parado: "",
          previsao_saida: "",
          updated_at: retorno.toISOString()
        })
        .in("frota", frotas);

      if (erroUpdate) {
        console.error("Erro ao liberar todos:", erroUpdate);
        respostaChat.innerText = `Erro ao liberar todos os ${descricaoAcao.plural}.`;
        return;
      }

      const historicos = pendentesDaAba.map(e => ({
        frota: e.frota,
        acao: "LIBEROU_TODOS",
        status_anterior: e.status || "",
        status_novo: "OK",
        observacao_anterior: e.observacao || "",
        observacao_nova: obterResumoLiberacao(e, retorno).texto,
        numero_os: e.numero_os || "",
        previsao_saida: "",
        mensagem_original: frenteAlvo
          ? `Comando: liberar todos da frente ${frenteAlvo}`
          : "Comando: liberar todos"
      }));

      await supabaseClient
        .from("historico_movimentacoes")
        .insert(historicos);

      respostaChat.innerText = `${pendentesDaAba.length} ${descricaoAcao.plural} foram liberados com sucesso${frenteAlvo ? ` na frente ${frenteAlvo}` : ""}.`;

      confirmacaoMassa = null;

      await carregarEquipamentos();
      await carregarHistorico();
      await gerarRelatorio();

    } catch (erro) {
      console.error(erro);
      respostaChat.innerText = "Erro ao executar liberação em massa.";
    }
  }
}

function iniciarProgresso(total) {
  const box = document.getElementById("progresso-box");
  const texto = document.getElementById("progresso-texto");
  const percentual = document.getElementById("progresso-percentual");
  const barra = document.getElementById("progresso-barra");

  if (!box || !texto || !percentual || !barra) return;

  box.style.display = "block";
  texto.innerText = `Processando 0 de ${total}`;
  percentual.innerText = "0%";
  barra.style.width = "0%";
}

function atualizarProgresso(atual, total) {
  const texto = document.getElementById("progresso-texto");
  const percentual = document.getElementById("progresso-percentual");
  const barra = document.getElementById("progresso-barra");

  if (!texto || !percentual || !barra) return;

  const valor = total > 0 ? Math.round((atual / total) * 100) : 0;

  texto.innerText = `Processando ${atual} de ${total}`;
  percentual.innerText = `${valor}%`;
  barra.style.width = `${valor}%`;
}

function finalizarProgresso() {
  setTimeout(() => {
    const box = document.getElementById("progresso-box");

    if (box) {
      box.style.display = "none";
    }
  }, 1500);
}

function alterarFiltroStatus() {
  const select = document.getElementById("filtro-status");

  if (!select) {
    return;
  }

  filtroStatusAtual = select.value;
  aplicarFiltroTabela();
}

function aplicarFiltroTabela() {
  if (estaNaAbaDisponibilidade()) {
    atualizarDisponibilidadeDia();
    return;
  }

  const equipamentosDaAba = abaAtual === "FRENTES"
    ? obterEquipamentosParaIndicadores()
    : obterEquipamentosDaAba();
  let equipamentosFiltrados = equipamentosDaAba;

  if (filtroStatusAtual === "PENDENTE") {
    equipamentosFiltrados = equipamentosDaAba.filter(e => e.status === "PENDENTE");
  }

  if (filtroStatusAtual === "OK") {
    equipamentosFiltrados = equipamentosDaAba.filter(e => e.status === "OK");
  }

  preencherTabela(equipamentosFiltrados);
  atualizarTextoFiltro(equipamentosFiltrados.length);

  if (abaAtual === "FRENTES") {
    renderizarFrentesDeColheita();
  }
}

function atualizarTextoFiltro(quantidade) {
  const textoFiltro = document.getElementById("texto-filtro");
  const config = obterConfiguracaoAba();
  const descricao = obterDescricaoAcaoAtual();
  const nomePlural = abaAtual === "FRENTES" ? descricao.plural : config.plural;

  if (!textoFiltro) {
    return;
  }

  if (filtroStatusAtual === "TODOS") {
    textoFiltro.innerText = `Mostrando ${nomePlural} ativos: ${quantidade}`;
  }

  if (filtroStatusAtual === "PENDENTE") {
    textoFiltro.innerText = `Mostrando somente ${nomePlural} pendentes: ${quantidade}`;
  }

  if (filtroStatusAtual === "OK") {
    textoFiltro.innerText = `Mostrando somente ${nomePlural} OK: ${quantidade}`;
  }
}

inicializarDataDisponibilidade();
carregarTemaSalvo();
carregarEquipamentos();
carregarHistorico();
