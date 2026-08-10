// Fixture: notícias do portal Mata Viva — espelha o conteúdo de content/noticias/.
// Ordenadas da mais recente para a mais antiga. Sem imagens (fixtures espelham
// o conteúdo real, que ainda não possui imagens).
import type { Noticia } from '../types';

export const noticias: Noticia[] = [
  {
    slug: 'esgoto-condominio-notificacao',
    titulo: 'Esgoto no Igarapé Água Branca: condomínio é notificado após cobrança da comunidade',
    data: '2026-07-28',
    categoria: 'agua-e-saneamento',
    autor: 'equipe-mata-viva',
    tags: ['esgoto', 'igarape-agua-branca', 'saneamento', 'ipaam'],
    destaque: true,
    resumo:
      'Após denúncia da comunidade e cobrança pública do Mata Viva, o condomínio responsável pelo despejo de esgoto no Igarapé Água Branca foi notificado. Uma reunião deve definir o cronograma de adequação.',
    corpoHtml:
      '<p>O Igarapé Água Branca recebeu, por meses, despejo de esgoto sem tratamento vindo de um condomínio da região. A denúncia foi levada pela comunidade e pela Associação Mata Viva a uma reunião com representantes do empreendimento.</p><p>Após a cobrança pública e o registro georreferenciado da ocorrência, o condomínio foi notificado pelo órgão ambiental competente. A notificação exige a apresentação de um plano de correção e o fim do despejo irregular.</p><blockquote><p>O igarapé é um bem comum. Ninguém tem o direito de transformar o nosso Água Branca em esgoto a céu aberto.</p></blockquote><p>A próxima reunião, que envolve o IPAAM e a Águas de Manaus, deve estabelecer prazos e a forma de monitoramento contínuo do ponto de lançamento. O Mata Viva seguirá acompanhando e publicando os desdobramentos.</p>',
  },
  {
    slug: 'mutirao-de-limpeza-apa-taruma',
    titulo: 'Mutirão de limpeza mobiliza moradores na APA Tarumã',
    data: '2026-06-30',
    categoria: 'comunidade',
    autor: 'joana-martins',
    tags: ['mutirao', 'comunidade', 'residuos'],
    destaque: false,
    resumo:
      'Mutirão reuniu moradores para retirar resíduos das margens do Água Branca e sensibilizar a vizinhança sobre o descarte correto.',
    corpoHtml:
      '<p>No último domingo de junho, moradores da APA Tarumã se organizaram em um mutirão de limpeza às margens do Igarapé Água Branca. Foram recolhidos sacos de resíduos sólidos, entre plásticos, garrafas e materiais de construção.</p><p>Além da coleta, o mutirão contou com uma roda de conversa sobre o descarte correto e a importância de manter as nascentes livres de lixo.</p><ul><li>Mais de 40 voluntários participaram da ação.</li><li>Os resíduos foram separados e destinados à coleta seletiva do bairro.</li><li>Novos mutirões devem ser realizados a cada trimestre.</li></ul><p>O Mata Viva acompanhou a ação e registrou os pontos de acúmulo de resíduos no mapa de ocorrências da bacia.</p>',
  },
  {
    slug: 'oficina-educacao-ambiental-estudantes',
    titulo: 'Oficina de educação ambiental reúne estudantes da região',
    data: '2025-11-18',
    categoria: 'comunidade',
    autor: 'joana-martins',
    tags: ['educacao-ambiental', 'escolas', 'oficina'],
    destaque: false,
    resumo:
      'Estudantes de escolas da região participaram de oficina sobre a bacia do Água Branca, com atividades de campo e brincadeiras educativas.',
    corpoHtml:
      '<p>Uma oficina de educação ambiental reuniu estudantes de escolas da região da APA Tarumã em um dia de atividades sobre a bacia do Igarapé Água Branca.</p><p>Com apoio dos voluntários do Mata Viva, as crianças conheceram a trajetória da água, do igarapé até os rios, e aprenderam sobre a importância das matas ciliares.</p><p>A atividade incluiu uma visita de campo às margens do Água Branca e um jogo de perguntas sobre o ciclo da água.</p>',
  },
  {
    slug: 'como-identificar-e-denunciar-queimadas',
    titulo: 'Como identificar e denunciar queimadas na região',
    data: '2025-10-02',
    categoria: 'meio-ambiente',
    autor: 'equipe-mata-viva',
    tags: ['queimadas', 'denuncia', 'prevencao'],
    destaque: false,
    resumo:
      'Guia prático explica como reconhecer focos de queimada, registrar a localização e acionar os canais oficiais de denúncia na região de Manaus.',
    corpoHtml:
      '<p>Na estiagem, cresce o risco de queimadas na região de Manaus, inclusive dentro da APA Tarumã. Saber identificar um foco cedo faz diferença para evitar que o fogo se espalhe.</p><p>Ao avistar fumaça ou chamas, o primeiro passo é registrar a localização aproximada e fotografar o local com segurança, sem se aproximar do fogo.</p><ul><li>Denuncie pelo telefone 193 (Corpo de Bombeiros) ou pelo 0800 do órgão ambiental.</li><li>Registre a ocorrência no portal do Mata Viva para que ela entre no mapa da bacia.</li><li>Compartilhe o alerta com a vizinhança apenas por canais confiáveis.</li></ul><p>A prevenção começa na comunidade: queimada não é prática de limpeza, é crime ambiental.</p>',
  },
];

export const noticiasPorSlug: Record<string, Noticia> = Object.fromEntries(
  noticias.map((noticia) => [noticia.slug, noticia]),
);

export const noticiaDestaque: Noticia = noticias.find(
  (noticia) => noticia.destaque,
) as Noticia;
