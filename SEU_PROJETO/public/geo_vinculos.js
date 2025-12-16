(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);

 const UNIDADES_COORDS_MANUAL = {

  // >>>>>>>>>>>>>>>>>>>>>>>>> AGUA PRETA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "CENTRO DE FISIOTERAPIA E ESPECIALIDADES":    {lat:-8.707678393145091, lon:-35.52079077622554},
  "HOSPITAL MUNICIPAL CIENTISTA NELSON CHAVES": {lat:-8.693645485606037, lon:-35.52602134923762},
  "POSTO DE SAUDE DR PEDRO ACIOLLY":            {lat:-8.706818744595324, lon:-35.52074833389617},
  "PSF AGROVILA LIBERAL":                       {lat:-8.588953891536837, lon:-35.502005552369326},
  "PSF CAMURIM":                                {lat:-8.69752255117704,  lon:-35.45954330116582},
  "PSF COHAB":                                  {lat:-8.711630985388638, lon:-35.5132643017222},
  "PSF CRUZ DE MALTA":                          {lat:-8.804762852828857, lon:-35.457484247389054},
  "PSF CRUZEIRO":                               {lat:-8.71364684603417,  lon:-35.51724888297207},
  "PSF FLORESCENTE":                            {lat:-8.743762725778973, lon:-35.48901060665349},
  "PSF FREI DAMIAO BOZZANO":                    {lat:-8.707843782913255, lon:-35.518371962731514},
  "PSF NOSSA SENHORA DA CONCEICAO":             {lat:-8.712404080593863, lon:-35.512988089719514},
  "PSF PADRE CICERO":                           {lat:-8.701934890057943, lon:-35.5274458050609},
  "PSF PIRANGI":                                {lat:-8.744359612908841, lon:-35.48900304923693},

  // >>>>>>>>>>>>>>>>>>>>>>>>> AGUAS BELAS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UBS ABEL DIAS DA SILVA":                     {lat:-9.114290869883407, lon:-37.122052749232125},
  "UBS AYRTON DIOGENES":                        {lat:-9.106942006298592, lon:-37.12213514738493},
  "UBS CAMILO VALETIM DE LIMA":                 {lat:-8.970060216683542, lon:-36.98865730949642},
  "UBS CICERO TELES BARBOZA":                   {lat:-9.114310750004792, lon:-37.12206940690258},
  "UBS GARANHUZINHO":                           {lat:-9.114370323518461, lon:-37.12210859340849},
  "UBS JOVELINA MARIA DOS SANTOS":              {lat:-9.114467014073673, lon:-37.122084913260004},
  "UBS LUIZ ANDRE PONTES VIEIRA":               {lat:-9.12128081394042,  lon:-37.1231008338907},
  "UBS PAULO MARANHAO":                         {lat:-9.10984696632949,  lon:-37.12397568971422},
  "UNIDADE DE SAUDE DA FAMILIA CAMPO GRANDE":   {lat:-9.088297101324258, lon:-36.98482432478773},
  "UNIDADE DE SAUDE DA FAMILIA ZILDA ARNS":     {lat:-9.109955287586676, lon:-37.12770099466366},
  "USF ALAN ROBERTO":                           {lat:-9.116476764532615, lon:-37.11564646272607},
  "USF BARRA NOVA":                             {lat:-9.112453611318637, lon:-37.117027527788544},
  "USF DONA LINDU":                             {lat:-9.110938747607939, lon:-37.221669276220204},
  "USF DR CLECIO XAVIER":                       {lat:-9.10775500629303,  lon:-37.11301370283507},
  "USF HELENA OLIVEIRA":                        {lat:-9.116434231433928, lon:-37.1124224050555},
  "USF NAHOR GUEIROS LAGOA DO BARRO":           {lat:-9.106817058966062, lon:-37.12397074728836},
  "USF ZUMBI":                                  {lat:-9.253098130870711, lon:-37.15383263388876},

  // >>>>>>>>>>>>>>>>>>>>>>>>> ALTO DO RODRIGUES <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "CENTRO DE SAUDE DA FAMILIA I":               {lat:-5.304040368837524,  lon:-36.76870774728834},
  "CENTRO DE SAUDE DA FAMILIA II":              {lat:-5.296818688281322,  lon:-36.76227044610427},
  "CENTRO DE SAUDE DA FAMILIA III":             {lat:-5.288170998633731,  lon:-36.76444616092025},
  "CENTRO DE SAUDE DA FAMILIA VI":              {lat:-5.410225778982056,  lon:-36.70347046276649},
  "CENTRO DE SAUDE DA FAMILIA V":               {lat:-5.2917846156517845, lon:-36.76006030509677},
  // ATENÇÃO: chave "CENTRO DE SAUDE DA FAMILIA VI" aparece de novo abaixo e vai sobrescrever a de cima:
  "CENTRO DE SAUDE DA FAMILIA VI":              {lat:-5.299137376583157,  lon:-36.764715269949924},
  "UNIDADE DE SAUDE DA FAMILIA DE TABATINGA":   {lat:-5.3216987732282455, lon:-36.7806816050965},

  // >>>>>>>>>>>>>>>>>>>>>>>>> APODI <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "CENTRO DE SAUDE DE APODI":                   {lat:-5.656865256291411, lon:-37.80058536276446},
  "CENTRO ESPECIALIZADO DE APODI":              {lat:-5.66391166432893,  lon:-37.797688651722375},
  "POSTO DE SAUDE CORREGO":                     {lat:-5.660675464025652, lon:-37.86723444742305},
  "POSTO DE SAUDE DE GOES":                     {lat:-5.427294476143354, lon:-37.78699027626039},
  "POSTO DE SAUDE DE SOLEDADE":                 {lat:-5.596922929999443, lon:-37.828955705058696},
  "POSTO DE SAUDE DO ARCAO":                    {lat:-5.8685283502358345,lon:-37.75507523392728},
  "POSTO DE SAUDE DO BAMBURRAL":                {lat:-5.700982456226133, lon:-37.73369082043464},
  "POSTO DE SAUDE MELANCIAS":                   {lat:-5.742519369349645, lon:-37.85044740509297},
  "POSTO DE SAUDE SANTA ROSA":                  {lat:-5.719127410244097, lon:-37.76980923392851},
  "UBS GALDINO JULIAO DA MOTA":                 {lat:-5.662088046982024, lon:-37.79889046276436},
  "UNIDADE BASICA DE SAUDE DA COMUNIDADE BICO TORTO":{lat:-5.665654689440232, lon:-37.793387132081875},
  "UNIDADE BASICA DE SAUDE DO BACURAU I":       {lat:-5.662857400141797, lon:-37.811083849270204},
  "UNIDADE BASICA DE SAUDE DO CAIC":            {lat:-5.661455393809024, lon:-37.79477434742313},
  "UNIDADE BASICA DE SAUDE DO IPE":             {lat:-5.665294800725006, lon:-37.789878333928975},
  "UNIDADE BASICA DE SAUDE SAO SEBASTIAO":      {lat:-5.662342476502105, lon:-37.80099603392908},

  // >>>>>>>>>>>>>>>>>>>>>>>>> ARAPONGA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "CENTRO DE SAUDE DE ARAPONGA":                {lat:-20.66692556637083, lon:-42.52108586247044},
  "CENTRO MUNICIPAL DE FISIOTERAPIA":           {lat:-23.409614197084615,lon:-51.43924128497489},
  "UNIDADE DE SAUDE DA FAMILIA DE ESTEVAO ARAUJO":{lat:-20.61181241135581,lon:-42.536406644492715},
  "UNIDADE DE SAUDE DA FAMILIA DE SAO DOMINGOS":{lat:-20.66928366010349, lon:-42.52008697596457},
  "UNIDADE DE SAUDE DA FAMILIA DO ESTOUROS":    {lat:-20.601896126991402,lon:-42.46816590480181},

  // >>>>>>>>>>>>>>>>>>>>>>>>> ASSU <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UBS ANTONIO CARLOS DANTAS DA SILVA":         {lat:-5.587816326607673, lon:-36.91931593208253},
  "UBS BELA VISTA PIATO":                       {lat:-5.522652308953436, lon:-37.00570896276548},
  "UBS DO RIACHO":                              {lat:-5.715431808799993, lon:-37.01814230694047},
  "UBS DR FRANCISCO EVARISTO DE OLIVEIRA SALES":{lat:-5.5697515689557555,lon:-36.92863208975332},
  "UBS JANDUIS":                                {lat:-6.017063769179615, lon:-37.40557933207872},
  "UBS JOANA FLORENCIO":                        {lat:-5.585564035525842, lon:-36.9111930897531},
  "UBS JOSE DINARTE SOARES":                    {lat:-5.5725885224636125,lon:-36.91546287810626},
  "UBS MARIA DA PENHA":                         {lat:-5.58655664839068,  lon:-36.90432666276507},
  "UBS MORADA NOVA":                            {lat:-5.608604264697436, lon:-36.90827854742352},
  "UBS NOVA ESPERANCA":                         {lat:-5.390186381604153, lon:-36.894775799101104},
  "UBS OFELIA WANDERLEY RODRIGUES":             {lat:-5.565624616287604, lon:-36.91629376276514},
  "UBS ORTENCIO FERREIRA LIMA":                 {lat:-5.590805216406694, lon:-36.93829900509429},
  "UBS PANON II":                               {lat:-5.4279050607555455,lon:-36.8890329762604},
  "UBS ROBERIO ROBERTO BEZERRA":                {lat:-5.576812811408338, lon:-36.915798016741384},
  "UBS SEVERINO MAIA":                          {lat:-5.567651786469734, lon:-36.91634910694166},
  "UNIDADE DE SAUDE OSMAR BATISTA DA SILVA":    {lat:-5.494505185556528, lon:-36.909144120436274},
  "USF FRUTILANDIA":                            {lat:-5.58778738230299,  lon:-36.91930986786939},
  "USF FRUTILANDIA II":                         {lat:-5.587662342906847, lon:-36.921653413810226},

  // >>>>>>>>>>>>>>>>>>>>>>>>> BRUMADO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "CONJUNTO PENAL DE BRUMADO":                  {lat:-14.217645582941827, lon:-41.63363633195464},
  "POSTO DE SAUDE RUBEM ALVES TEIXEIRA":        {lat:-14.209020976604936, lon:-41.67696656263731},
  "UNIDADE DE SAUDE DA FAMILIA DR ARLINDO MAGNO STANCHI":{lat:-14.200848072551228, lon:-41.65521896263757},
  "UNIDADE DE SAUDE DA FAMILIA DR JOSE CLEMENTE ALVES GONDIM":{lat:-14.214695481786997, lon:-41.67259873564911},
  "UNIDADE DE SAUDE DA FAMILIA DR NEWTON ALVES DE CASTRO":{lat:-14.209000175392957, lon:-41.67697466263731},
  "UNIDADE DE SAUDE DA FAMILIA DR PAULO VARGAS":{lat:-14.214716282475345, lon:-41.67253436263728},
  "UNIDADE DE SAUDE DA FAMILIA WILSON TIBO":    {lat:-14.245767109102411, lon:-41.73074970496595},
  "USF ALTINO ELIZEU DE SOUZA":                 {lat:-14.398872657903398, lon:-41.64093306263339},
  "USF ENFERMEIRA KEILA FRANCIOLE LIMA ALVES TEIXEIRA":{lat:-14.218853484416632, lon:-41.66820287797837},
  "USF IVANEIDE DAS NEVES SANTOS TEIXEIRA":     {lat:-14.199564467597275, lon:-41.6798048338021},
  "USF LEOBINO JOSE DE SOUZA":                  {lat:-14.103930999693443, lon:-41.66239923380408},
  "USF LIZIANE DOS SANTOS ALVES":               {lat:-14.202897862465312, lon:-41.676097324002306},
  "USF MARCIONILIO RODRIGUES DOS SANTOS":       {lat:-14.207053578607432, lon:-41.685806733802146},

  // >>>>>>>>>>>>>>>>>>>>>>>>> CANAÃ <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    
  "UNIDADE BASICA DE SAUDE DE CANAA":           {lat:-20.430910586384094, lon:-42.72059015099057},


  // >>>>>>>>>>>>>>>>>>>>>>>>> CARNAUBAIS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<



  // >>>>>>>>>>>>>>>>>>>>>>>>> CONDE <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UBS CARAPIBUS":                              {lat:-7.295050568985137,lon:-34.819915455988614},
  "UBS CENTRO":                                 {lat:-7.26161022939337, lon:-34.90688299146979},
  "UBS JACUMA":                                 {lat:-7.285043417779798, lon:-34.803959439852235},
  "UBS JOSE MANGUEIRA RAMALHO DR MANGUEIRA":    {lat:-7.253134077807469, lon:-34.90568352093053},
  "UBS MATA DA CHICA":                          {lat:-7.306234204680765, lon:-34.89487110890326},
  "UBS MITUACU":                                {lat:-7.237228231265473, lon:-34.85433425188311},
  "UBS NOSSA SENHORA DA CONCEICAO":             {lat:-7.254255276395989, lon:-34.9039213739885},
  "UBS NOSSA SENHORA DAS NEVES":                {lat:-7.261360001902509, lon:-34.907057820929225},
  "UBS POUSADA DO CONDE":                       {lat:-7.242243180516525, lon:-34.925641288791944},
  "UBS QUILOMBOLA DO GURUGI":                   {lat:-7.267180831922434, lon:-34.84854000558578},
  "UBS VILLAGE":                                {lat:-7.284939479778346, lon:-34.80578249121083},

  // >>>>>>>>>>>>>>>>>>>>>>>>> CORDEIRO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "ESF RODOLFO":                                {lat:-22.03688083412925, lon:-42.37747493118583},
  "PSF CENTRO":                                 {lat:-22.025946510230618, lon:-42.35964761981782},
  "PSF LAVRINHAS":                              {lat:-22.035089838331047, lon:-42.37366083331089},
  "PSF MANANCIAL":                              {lat:-22.027567245116153, lon:-42.36146243795752},
  "PSF RETIRO POETICO":                         {lat:-22.027057911712813, lon:-42.365159573791466},
  "PSF SAO LUIZ":                               {lat:-22.024223017072515, lon:-42.36503089353772},


  // >>>>>>>>>>>>>>>>>>>>>>>>> FERNANDO PEDROZA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<


  // >>>>>>>>>>>>>>>>>>>>>>>>> GUARABIRA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UBS ALTO DA BOA VISTA IRACEMA DA SILVA PONTES":{lat:-6.84578916903714, lon:-35.502857674007956},
  "UBS ASSIS CHATEAUBRIAND ANSELMO DE ARAUJO ALEXANDRE":{lat:-6.864238667372515, lon:-35.4883706136358},
  "UBS BAIRRO NOVO II":                         {lat:-6.841854255063499, lon:-35.49764957500824},
  "UBS BAIRRO NOVO LUIZ TOLENTINO DE ALUSTAU":  {lat:-6.847035106221075, lon:-35.491707905691804},
  "UBS CACHOEIRA DR ARISTIDES VILLAR":          {lat:-6.891863665165511, lon:-35.47727864431588},
  "UBS CLOVIS BEZERRA NANA PORPINO":            {lat:-6.85490402016031, lon:-35.489513144321705},
  "UBS CONTENDAS ANTONIO C BARBOSA":            {lat:-6.850335920967935, lon:-35.492000282953526},
  "UBS CORDEIRO JOSE NICOLAU PESSOA":           {lat:-6.849621864651369, lon:-35.500061421584796},
  "UBS JUA APARECIDA":                          {lat:-6.8470054785939745, lon:-35.48612963637626},
  "UBS MUTIRAO IRMA MARIA ALVES DE ALMEIDA":    {lat:-6.87998281477601, lon:-35.49659142102894},
  "UBS NACOES":                                 {lat:-6.849581310729751, lon:-35.487164390349236},
  "UBS NORDESTE I DR OSVALDO AZEVEDO":          {lat:-6.852339968009024, lon:-35.48265578295331},
  "UBS NORDESTE II FRANCISCO ARAUJO DO NASCIMENTO FILHO":{lat:-6.85275405111526, lon:-35.47859566761097},
  "UBS NORDESTE III":                           {lat:-6.8568670821083435, lon:-35.48614652103248},
  "UBS PIRPIRI":                                {lat:-6.857486216479367, lon:-35.4417328210324},
  "UBS PRIMAVERA JOSEFA TOMAZ DE ARRUDA":       {lat:-6.852789073057256, lon:-35.49694477500644},
  "UBS ROSARIO AMORIM DA COSTA ROSARIO":        {lat:-6.8603108778631645, lon:-35.49211998295204},
  "UBS SANTA TEREZINHA DR JOAO SOARES":         {lat:-6.853062599592395, lon:-35.49035554432202},
  "UBS SAO JOSE DR MILTON DE MOURA RESENDE":    {lat:-6.859056151899463, lon:-35.49064334432108},
  "UBS TANANDUBA DR ODACI S ROCHA":             {lat:-6.817536160673249, lon:-35.435492836380924},


  // >>>>>>>>>>>>>>>>>>>>>>>>> ITABAIANA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UBSF ACUDE DAS PEDRAS":                      {lat:-7.328458063371508, lon:-35.33309304581066},
  "UBSF BOTAFOGO":                              {lat:-7.334125420598666, lon:-35.33423934473028},
  "UBSF CAMPO GRANDE":                          {lat:-7.367582407865127, lon:-35.34742429709151},
  "UBSF CASA DA MAE POBRE":                     {lat:-7.328709135321812, lon:-35.332927240246654},
  "UBSF COSTA E SILVA":                         {lat:-26.273842449187494, lon:-48.872154993703155},
  "UBSF DE BREJINHO":                           {lat:-7.328575999786122, lon:-35.33279302515874},
  "UBSF DE GUARITA":                            {lat:-7.328535182150275, lon:-35.332889255848265},
  "UBSF PAULO OUVIDIO DE LUCENA":               {lat:-7.328714323392547, lon:-35.332846611665076},
  "UBSF SITIO NOVO":                            {lat:-7.335792892582956, lon:-35.33686063071959},
  "UBSF SUBURBANA":                             {lat:-7.32854024690041, lon:-35.332911686528796},


  // >>>>>>>>>>>>>>>>>>>>>>>>> ITAPOROROCA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  
  "CENTRO DE ASSISTENCIA INTEGRADA DE SAUDE ITAPOROROCA":{lat:-6.824664305365948, lon:-35.24306798653171},
  "UNIDADE BASICA DE SAUDE DO TAMBOR":          {lat:-6.830903030479323, lon:-35.251766000019586},
  "UNIDADE DE SAUDE DA FAMILIA CIPOAL":         {lat:-6.766709255760031, lon:-35.261270928860654},
  "UNIDADE DE SAUDE DA FAMILIA CRUZEIRO":       {lat:-6.826895891966645, lon:-35.2509940270095},
  "UNIDADE DE SAUDE DA FAMILIA ROSEIRA":        {lat:-6.829782293310484, lon:-35.244073288387085},
  "UNIDADE DE SAUDE DA FAMILIA SAO JOAO":       {lat:-6.832650599914752, lon:-35.25352583071705},

  // >>>>>>>>>>>>>>>>>>>>>>>>> ITATUBA  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<


  // >>>>>>>>>>>>>>>>>>>>>>>>> MACAIBA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "E S F AS MARIAS":                            {lat:-5.920048811801889, lon:-35.54935950932843},
  "E S F BELA VISTA":                           {lat:-5.917780895179253, lon:-35.3042727288542},
  "E S F CAJAZEIRAS":                           {lat:-5.926997470405026, lon:-35.53948918654362},
  "E S F CAMPESTRE":                            {lat:-5.935532815536551, lon:-35.306644557707365},
  "E S F CAMPINAS":                             {lat:-5.870337111440619, lon:-35.35000707119877},
  "E S F CAMPO DA SANTA CRUZ":                  {lat:-5.856525170472277, lon:-35.35219352885734},
  "E S F CAMPO DAS MANGUEIRAS":                 {lat:-5.848134421123079, lon:-35.36033828654092},
  "E S F CAMPO SANTO":                          {lat:-5.854250269557395, lon:-35.359034800027125},
  "E S F CANA BRAVA":                           {lat:-5.98451400382675, lon:-35.4061985730466},
  "E S F CONJUNTO AUTA DE SOUSA":               {lat:-5.94694461795997, lon:-35.51836325585559},
  "E S F DE CAPOEIRAS":                         {lat:-5.995565407498484, lon:-35.52878101352998},
  "E S F DE GUARAPES":                          {lat:-5.840656056661051, lon:-35.27362848285047},
  "E S F ELOI DE SOUZA":                        {lat:-5.849141986431979, lon:-35.35044064235437},
  "E S F FERREIRO TORTO":                       {lat:-5.862578553618093, lon:-35.335264962006015},
  "E S F JOSE COELHO":                          {lat:-5.853000460657441, lon:-35.36375613071657},
  "E S F LAGOA DO SITIO":                       {lat:-5.855050630119432, lon:-35.48075585587983},
  "E S F LAGOA DOS CAVALOS":                    {lat:-15.102988930421462, lon:-51.4057504234683},
  "E S F LOTEAMENTO ESPERANCA":                 {lat:-5.870719338980551, lon:-35.34404624236353},
  "E S F LUIZ ANTONIO DA FONSECA":              {lat:-5.855832044356168, lon:-35.35228618655014},
  "E S F MANGABEIRA II":                        {lat:-5.84909743528309, lon:-35.31478890525089},
  "E S F MORADA DA FE":                         {lat:-5.844816296346964, lon:-35.35475151353499},
  "E S F POTENGI":                              {lat:-5.850022525927137, lon:-35.356248055867106},
  "E S F RIACHO DO SANGUE":                     {lat:-5.920688825957633, lon:-35.37629845769571},
  "E S F TAPARA":                               {lat:-5.856567861816777, lon:-35.35216134235752},
  "E S F TRAIRAS":                              {lat:-5.984163092608104, lon:-35.48191902886129},
  "E S F VILA SAO JOSE":                        {lat:-5.8439811923727545, lon:-35.34410920002044},
  "E S F VILAR":                                {lat:-5.869362548218076, lon:-35.34258879817761},
  "POSTO DE SAUDE DE BETULIA":                  {lat:-5.966842278813496, lon:-35.40573606933781},
  "POSTO DE SAUDE DE LAGOA DO LIMA":            {lat:-5.900861116347486, lon:-35.47306184420051},
  "POSTO DE SAUDE DE RIACHO DO FEIJAO":         {lat:-5.918405585036805, lon:-35.37419562145977},
  "POSTO DE SAUDE MATA VERDE":                  {lat:-15.68797926249987, lon:-40.73957777305763},
  "PRONTO ATENDIMENTO ODONTOLOGICO DE MACAIBA": {lat:-5.854363661103231, lon:-35.35283388654302},
  "VILA SAO JOSE II":                           {lat:-5.844045230824235, lon:-35.34411992886424},

  // >>>>>>>>>>>>>>>>>>>>>>>>> MOGEIRO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UNIDADE MISTA DE SAUDE MARIA HERMINIA DA SILVEIRA":{lat:-7.3064996320003255, lon:-35.47719710002417},
  "USF 7 SITIO CABRAL":                         {lat:-7.274368622994291, lon:-35.54590251536174},
  "USF I MARIA DA GLORIA ALVES DA SILVA":       {lat:-7.308772450097464, lon:-35.47779291538115},
  "USF II TEREZINHA BENICIO DA COSTA":          {lat:-7.3028790221715205, lon:-35.47745622700468},
  "USF III MARIA DO SOCORRO DA SILVA":          {lat:-7.294785276142927, lon:-35.50012530003255},
  "USF IV JOSEFA VICENCIA DA CONCEICAO":        {lat:-7.294859770113539, lon:-35.50018967304765},
  "USF V JOSE PINTO DA SILVA":                  {lat:-7.29810351979385, lon:-35.45356820372673},
  "USF VI FRANCISCO CANDIDO DA SILVA":          {lat:-7.309227950289715, lon:-35.473924244216995},

  // >>>>>>>>>>>>>>>>>>>>>>>>> PATU <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UNIDADE DE SAUDE DA FAMILIA JOAO INACIO":    {lat:-6.092131159826162, lon:-37.63859153085699},
  "UNIDADE DE SAUDE DA FAMILIA LOURIVAL ROCHA": {lat:-6.112294443182142, lon:-37.64122312885835},
  "UNIDADE DE SAUDE DA FAMILIA ROSALITA FORTE DANTAS":{lat:-6.106065540685914, lon:-37.64054372702747},

  // >>>>>>>>>>>>>>>>>>>>>>>>> PITIMBU <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UBS COSMO VALDEVINO DOS SANTOS ANDREZA":     {lat:-7.531006801693054, lon:-34.82168465769568},
  "USF ACAU COLONIA":                           {lat:-7.488115315928535, lon:-34.81464187490799},
  "USF ACAU MUCUIM":                            {lat:-7.533220747817258, lon:-34.830528228864246},
  "USF APAZA":                                  {lat:-7.411199576721385, lon:-34.853349355867266},
  "USF CAMUCIM":                                {lat:-7.4528577888898795, lon:-34.838526457714266},
  "USF PITIMBU GUARITA":                        {lat:-7.487675102443336, lon:-34.815428644205106},
  "USF PITIMBU VILA":                           {lat:-7.47230858328267, lon:-34.811144359549765},
  "USF TAQUARA":                                {lat:-7.490749980021085, lon:-34.84861137304095},


  // >>>>>>>>>>>>>>>>>>>>>>>>> PAULA CANDIDO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UNIDADE BASICA DE SAUDE DE PAULA CANDIDO":   {lat:-20.875795340536634, lon:-42.97560739361248},
  "UNIDADE BASICA DE SAUDE PAULA CANDIDO":      {lat:-20.873667810441674, lon:-42.97793238844364},
  "UNIDADE SAUDE FAMILIA ZONA C PAULA CANDIDO": {lat:-20.81040726439237, lon:-42.95717216934676},

  // >>>>>>>>>>>>>>>>>>>>>>>>> PENDENCIAS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UBS DA FAMILIA LUZIA TORQUATO":              {lat:-5.269404862223158, lon:-36.72040662700888},
  "UBS DIMAS MARTINS CABRAL":                   {lat:-5.260498108870744, lon:-36.71349345769679},
  "UBS MARIA DAS DORES BARBOSA":                {lat:-5.195274674344025, lon:-36.691908728861904},


  // >>>>>>>>>>>>>>>>>>>>>>>>> POÇO BRANCO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UNIDADE BASICA DE SAUDE UBS 2":              {lat:-5.620334849216373, lon:-35.66722457625878},
  "UNIDADE BASICA DE SAUDE UBS 1":              {lat:-5.6177808947140715,lon:-35.65666902858305},
  "UNIDADE BASICA DE SAUDE UBS 5":              {lat:-5.6177808947140715,lon:-35.65666902858305},
  "UNIDADE BASICA DE SAUDE UBS 4":              {lat:-5.6177808947140715,lon:-35.65666902858305},
  "UNIDADE BASICA DE SAUDE UBS 3":              {lat:-5.624243550949819, lon:-35.66218740031616},
  "UBS BAIXOS DE SAO MIGUEL":                   {lat:-5.522565434731181, lon:-35.70291234742435},
  "UNIDADE BASICA DE SAUDE UBS 6":              {lat:-5.617862413478534, lon:-35.65669504071813},


  //>>>>>>>>>>>>>>>>>>>>>>>>> SANTA RITA <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  "UNIDADE DE PSF ALDENY MONTENEGRO":           {lat:-7.129200506967433, lon:-34.979439800024196},
  "UNIDADE DE PSF ANA VIRGINIA":                {lat:-7.129910820204904, lon:-34.974768344203646},
  "UNIDADE DE PSF BARAO DO ABIAY":              {lat:-7.128681127921428, lon:-34.95647634235687},
  "UNIDADE DE PSF BEBELANDIA":                  {lat:-7.155508832357189, lon:-34.9789681865334},
  "UNIDADE DE PSF CARMEM LUCIA FIRMINO DA SILVA":{lat:-7.138931856549709, lon:-34.964902429723},
  "UNIDADE DE PSF CELESTE RIBEIRO":             {lat:-7.118932692610873, lon:-34.94935710002169},
  "UNIDADE DE PSF CELIA SANTIAGO":              {lat:-7.134490772884795, lon:-34.98515799816616},
  "UNIDADE DE PSF DONA ZUZA ALVINO":            {lat:-7.164045453430157, lon:-34.98164881351915},
  "UNIDADE DE PSF DR DORIVALDO PEREIRA DA SILVA":{lat:-7.152763810597982, lon:-34.96843984050532},
  "UNIDADE DE PSF DR ROMEU DE AZEVEDO MENEZES": {lat:-7.143730079117816, lon:-34.96873944049965},
  "UNIDADE DE PSF DR TEIXEIRA DE VASCONCELOS":  {lat:-7.144795617141629, lon:-34.96551475954369},
  "UNIDADE DE PSF ENF MARCIA VALERIA RODRIGUES":{lat:-7.156073683161168, lon:-34.9583484423708},
  "UNIDADE DE PSF FARM ANTONIO AZEVEDO":        {lat:-7.120101093657241, lon:-34.9756686000851},
  "UNIDADE DE PSF FLAVIO MAROJA":               {lat:-7.133313015088193, lon:-34.97908370690934},
  "UNIDADE DE PSF FRANCISCA LIRA DE CARVALHO":  {lat:-7.129569732962544, lon:-34.98364264237083},
  "UNIDADE DE PSF FRANCISCA MORAIS DE QUEIROGA":{lat:-7.251307568571117, lon:-34.98409480004251},
  "UNIDADE DE PSF FRANCISCA PANTA":             {lat:-7.12132291381168, lon:-34.95657030136153},
  "UNIDADE DE PSF HEITEL SANTIAGO":             {lat:-7.164248424472188, lon:-34.9557602235792},
  "UNIDADE DE PSF IRMA CACILDA":                {lat:-7.159928006249429, lon:-34.98332527303637},
  "UNIDADE DE PSF JOSE ALVES VIEIRA":           {lat:-7.1580656888101775, lon:-34.96931007118875},
  "UNIDADE DE PSF JOSE VICENTE DE PONTES":      {lat:-7.13226416694618, lon:-34.95390785955352},
  "UNIDADE DE PSF LEROLANDIA":                  {lat:-6.9779782595298325, lon:-34.98376354237086},
  "UNIDADE DE PSF LIVRAMENTO":                  {lat:-6.977935213974183, lon:-34.98373214237087},
  "UNIDADE DE PSF MARCOS MOURA II":             {lat:-7.167214314974263, lon:-34.981458573046595},
  "UNIDADE DE PSF MARCOS MOURA III":            {lat:-7.13831580621773, lon:-34.96475113071621},
  "UNIDADE DE PSF MARIA DE LOURDES ALVES DE ASSIS":{lat:-7.123531017678866, lon:-34.97008322886505},
  "UNIDADE DE PSF MAURICE VAN WOENSEL":         {lat:-7.134635267828106, lon:-34.97859566934113},
  "UNIDADE DE PSF MIRIRI":                      {lat:-6.952000300730321, lon:-35.12411235770173},
  "UNIDADE DE PSF ODON LEITE":                  {lat:-7.152793274636916, lon:-34.962128523427985},
  "UNIDADE DE PSF PADRE MALAGRIDA I":           {lat:-7.154006165659408, lon:-34.96746387305764},
  "UNIDADE DE PSF PADRE PAULO KOELLEN":         {lat:-7.127565911124217, lon:-34.985137900031916},
  "UNIDADE DE PSF PEDRO CICERO BENICIO":        {lat:-7.126614181064816, lon:-34.95312470187658},
  "UNIDADE DE PSF PREFEITO DR OILDO SOARES":    {lat:-7.155494685060889, lon:-34.97629393072789},
  "UNIDADE DE PSF USINA SAO JOAO":              {lat:-7.136939094461656, lon:-35.000321057704845},
  "UNIDADE DE PSF VIDAL DE NEGREIROS":          {lat:-7.134240847311458, lon:-34.98024360003065},

};


  function obterMunicipioAtualDaUI() {
    const header = document.querySelector('#tab-vinculos .dashboard-chart-header h3');
    if (header && header.textContent) {
      const txt = header.textContent.trim();
      const partes = txt.split('-');
      if (partes.length >= 2) {
        return partes.slice(1).join('-').trim();
      }
    }
    return g.currentMunicipality || g.currentMunicipio || '';
  }

  // Em vez de "geocodificar", agora só consulta a tabela manual
  function geocodeUnidade(nomeUnidade, municipioNome) {
    if (!nomeUnidade) return null;

    const nomeBruto = String(nomeUnidade).trim();
    const coord = UNIDADES_COORDS_MANUAL[nomeBruto];

    if (coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lon)) {
      return {
        lat: coord.lat,
        lon: coord.lon,
        origem: 'manual',
        nome: nomeBruto,
        municipio: municipioNome || obterMunicipioAtualDaUI() || ''
      };
    }

    console.warn('[geo_vinculos] Não há coordenadas cadastradas para a unidade:', nomeBruto);
    return null;
  }

  function distanciaHaversineKm(a, b) {
    if (!a || !b) return Infinity;

    const R = 6371;
    const toRad = (v) => v * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDLat2 = Math.sin(dLat / 2);
    const sinDLon2 = Math.sin(dLon / 2);

    const x = sinDLat2 * sinDLat2 +
              Math.cos(lat1) * Math.cos(lat2) * sinDLon2 * sinDLon2;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  function coletarUnidadesDaTabela() {
    const tabelaBody = document.querySelector('#tabelaVinculos tbody');
    if (!tabelaBody) return [];
    const nomes = new Set();
    tabelaBody.querySelectorAll('tr td:first-child').forEach(td => {
      const nome = td.textContent && td.textContent.trim();
      if (nome) nomes.add(nome);
    });
    return Array.from(nomes);
  }

  async function calcularVizinhoMaisProximo(unidadeOrigem) {
    if (!unidadeOrigem) return null;

    const municipio = obterMunicipioAtualDaUI();
    const unidades = coletarUnidadesDaTabela().filter(n => n !== unidadeOrigem);
    if (unidades.length === 0) return null;

    const coordOrigem = geocodeUnidade(unidadeOrigem, municipio);
    if (!coordOrigem) {
      console.warn('[geo_vinculos] Unidade de origem sem coordenadas:', unidadeOrigem);
      return null;
    }

    let melhor = null;
    for (const nome of unidades) {
      const coordDestino = geocodeUnidade(nome, municipio);
      if (!coordDestino) continue;

      const dist = distanciaHaversineKm(coordOrigem, coordDestino);
      if (!melhor || dist < melhor.distanciaKm) {
        melhor = {
          origem: { nome: unidadeOrigem, municipio, ...coordOrigem },
          destino: { nome, municipio, ...coordDestino },
          distanciaKm: dist
        };
      }
    }

    return melhor;
  }

  function criarUI() {
    const tab = document.getElementById('tab-vinculos');
    const tabela = document.getElementById('tabelaVinculos');
    if (!tab || !tabela) return;

    if (document.getElementById('geoVinculosPanel')) return;

    const panel = document.createElement('section');
    panel.id = 'geoVinculosPanel';
    panel.style.marginTop = '1.5rem';
    panel.style.padding = '1.25rem';
    panel.style.borderRadius = '0.75rem';
    panel.style.border = '1px solid #E5E7EB';
    panel.style.background = '#F9FAFB';

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
        <div style="flex:1 1 220px; min-width:220px;">
          <h3 style="margin:0 0 .25rem 0; font-size:1rem; font-weight:600; color:#111827;">
            Redistribuição por Unidade Vizinha
          </h3>
          <p style="margin:0; font-size:0.85rem; color:#6B7280;">
            Selecione uma unidade com equipes acima do limite para sugerir a unidade vizinha mais próxima
            e apoiar a reterritorialização.
          </p>
        </div>
        <div style="flex:1 1 260px; min-width:260px; display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; justify-content:flex-end;">
          <div style="flex:1 1 160px; min-width:160px;">
            <label for="geoUnidadeOrigem" style="display:block; font-size:.75rem; font-weight:500; color:#4B5563; margin-bottom:4px;">
              Unidade de origem
            </label>
            <select id="geoUnidadeOrigem" style="width:100%; padding:.45rem .75rem; border-radius:.5rem; border:1px solid #D1D5DB; font-size:.875rem; color:#111827; background-color:#fff;">
              <option value="">Selecione a unidade de origem</option>
            </select>
          </div>
          <button id="geoBtnCalcularVizinho" type="button"
            style="padding:.55rem 1.1rem; border-radius:.5rem; border:none; cursor:pointer;
                   background:#2563EB; color:#fff; font-size:.875rem; font-weight:500;
                   display:inline-flex; align-items:center; gap:.4rem; white-space:nowrap;">
            <span>Calcular vizinho mais próximo</span>
          </button>
        </div>
      </div>
      <div id="geoResultadoVizinho"
           style="margin-top:1rem; padding:.75rem .9rem; border-radius:.5rem;
                  background:#EFF6FF; color:#1F2937; font-size:.85rem; display:none;">
      </div>
    `;

    const container = tabela.parentElement;
    if (container && container.parentElement) {
      container.parentElement.appendChild(panel);
    } else {
      tab.appendChild(panel);
    }

    const botao = panel.querySelector('#geoBtnCalcularVizinho');
    const select = panel.querySelector('#geoUnidadeOrigem');
    const resultado = panel.querySelector('#geoResultadoVizinho');

    function atualizarSelectComUnidades() {
      if (!select) return;
      const unidades = coletarUnidadesDaTabela();
      const valorAtual = select.value;
      select.innerHTML = '';

      if (unidades.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhuma unidade carregada ainda';
        select.appendChild(opt);
        return;
      }

      const optDefault = document.createElement('option');
      optDefault.value = '';
      optDefault.textContent = 'Selecione a unidade de origem';
      select.appendChild(optDefault);

      unidades.forEach((nome) => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        select.appendChild(opt);
      });

      if (valorAtual && unidades.includes(valorAtual)) {
        select.value = valorAtual;
      }
    }

    atualizarSelectComUnidades();
    const tabelaBody = document.querySelector('#tabelaVinculos tbody');
    if (tabelaBody && typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(() => atualizarSelectComUnidades());
      obs.observe(tabelaBody, { childList: true, subtree: false });
    }

    botao && botao.addEventListener('click', async () => {
      const unidade = select && select.value;
      if (!unidade) {
        resultado.style.display = 'block';
        resultado.style.background = '#FEF3C7';
        resultado.style.color = '#92400E';
        resultado.textContent = 'Selecione uma unidade de origem para calcular o vizinho mais próximo.';
        return;
      }

      resultado.style.display = 'block';
      resultado.style.background = '#DBEAFE';
      resultado.style.color = '#1E3A8A';
      resultado.textContent = 'Calculando unidade vizinha mais próxima…';

      try {
        const melhor = await calcularVizinhoMaisProximo(unidade);
        if (!melhor) {
          resultado.style.background = '#FEE2E2';
          resultado.style.color = '#991B1B';
          resultado.textContent = 'Não foi possível sugerir uma unidade vizinha automática. Verifique se todas as unidades têm coordenadas cadastradas.';
          return;
        }

        const dist = melhor.distanciaKm;
        const distTxt = (!Number.isFinite(dist))
          ? 'distância não calculada'
          : `${dist.toFixed(2)} km`;

        resultado.style.background = '#ECFDF3';
        resultado.style.color = '#14532D';
        resultado.innerHTML = `
          <strong>Sugestão de redistribuição:</strong><br>
          Unidade de origem: <strong>${melhor.origem.nome}</strong><br>
          Unidade vizinha mais próxima: <strong>${melhor.destino.nome}</strong><br>
          Distância aproximada entre as unidades: <strong>${distTxt}</strong><br>
          <span style="font-size:.8rem; color:#4B5563; display:block; margin-top:.25rem;">
            * Distância calculada com base em coordenadas geográficas aproximadas (linha reta).
          </span>
        `;
      } catch (e) {
        console.error(e);
        resultado.style.display = 'block';
        resultado.style.background = '#FEE2E2';
        resultado.style.color = '#991B1B';
        resultado.textContent = 'Ocorreu um erro ao calcular o vizinho mais próximo.';
      }
    });

    g.geoVinculos = Object.assign(g.geoVinculos || {}, {
      geocodeUnidade,
      calcularVizinhoMaisProximo,
      coletarUnidadesDaTabela
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarUI);
  } else {
    criarUI();
  }
})();
