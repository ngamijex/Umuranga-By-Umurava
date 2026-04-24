/**
 * Candidate Test-Data Generator
 * Generates 50, 150, 500, 1000, and 2000 realistic candidate JSON files
 * covering a wide spectrum of fit levels for a "Data Scientist / Data & Analytics" role.
 *
 * Run: node generate-candidates.js
 */

const fs = require("fs");

// ─── Name pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Amara","Kwame","Keza","Fatoumata","Oluwaseun","Chidimma","Akinwale","Nkechi",
  "Abebe","Tigist","Yetunde","Abayomi","Chukwuemeka","Olajide","Bisola","Tunde",
  "Ama","Kofi","Efua","Akua","Mamadou","Aminata","Bakary","Fatima","Hassan",
  "Ibrahim","Maryam","Oumar","Rokhaya","Salimata","Leilani","Tanaka","Mwangi",
  "Kamau","Ochieng","Adhiambo","Otieno","Njoroge","Wanjiku","Wangui","Mutua",
  "Emmanuel","Grace","Faith","Hope","Joy","Peace","Blessing","Mercy","Joshua",
  "Samuel","Daniel","Moses","Solomon","Isaac","Jacob","Ruth","Esther","Deborah",
  "Miriam","Naomi","Rebekah","Rachel","Hannah","Priscilla","Lydia","Phoebe",
  "Mark","Luke","John","Peter","Paul","Andrew","Philip","James","Thomas","Matthew",
  "David","Michael","Sarah","Rebecca","Catherine","Victoria","Elizabeth","Charlotte",
  "Liam","Noah","Olivia","Emma","Sophia","Isabella","Mia","Ava","Luna","Aria",
  "Ethan","Luca","Mason","Aiden","Lucas","Oliver","Elijah","James","Benjamin","Logan",
  "Amelia","Harper","Evelyn","Abigail","Emily","Ella","Elizabeth","Camila","Scarlett",
  "Claude","Pierre","Marie","Jean","François","Isabelle","Antoine","Hélène","Maxime",
  "Nguyen","Tran","Le","Pham","Hoang","Phan","Dinh","Ngo","Do","Vu","Dang","Bui",
  "Carlos","Maria","Juan","Ana","Luis","Carmen","Miguel","Elena","José","Laura",
  "Aleksander","Natalia","Dmitri","Olga","Sergei","Tatiana","Vladimir","Yulia",
  "Aisha","Fatimah","Zara","Hana","Leila","Nadia","Layla","Yasmin","Rania","Dina",
  "Raj","Priya","Arjun","Kavya","Vikram","Ananya","Rohan","Divya","Sanjay","Meera",
  "Wei","Mei","Jing","Yang","Xin","Qing","Hao","Ling","Fang","Tao","Zhen","Yun",
  "Sipho","Thabo","Lerato","Nomsa","Bongani","Zanele","Lungelo","Thandeka","Sifiso",
  "Muthoni","Waweru","Gathoni","Muriuki","Wachira","Kinyua","Macharia","Ndegwa",
  "Habimana","Niyonzima","Kamanzi","Uwimana","Ndayishimiye","Hakizimana","Gasana",
  "Mugenzi","Ntakirutimana","Bizimana","Uwineza","Nyiransengimana","Uwase",
  "Ingabire","Ishimwe","Nsanzimana","Tumusime","Mugisha","Kagabo","Nshimiyimana",
];

const LAST_NAMES = [
  "Mensah","Okafor","Diallo","Nkosi","Boateng","Adeola","Eze","Obi","Asante",
  "Kamara","Conde","Traore","Coulibaly","Doumbia","Kouyate","Bah","Barry","Balde",
  "Mwangi","Odhiambo","Njoroge","Kipchoge","Rotich","Chebet","Langat","Kibet","Bett",
  "Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Taylor",
  "Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Robinson","Clark",
  "Rodriguez","Lewis","Lee","Walker","Hall","Allen","Young","Hernandez","King","Wright",
  "Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Carter",
  "Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards",
  "Collins","Stewart","Sanchez","Morris","Rogers","Reed","Cook","Morgan","Bell","Murphy",
  "Bailey","Rivera","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson",
  "Kumar","Sharma","Singh","Patel","Gupta","Joshi","Mehta","Shah","Reddy","Nair",
  "Zhang","Wang","Liu","Chen","Yang","Huang","Wu","Zhou","Sun","Ma","Gao","He","Li",
  "Bugingo","Sibomana","Munyaneza","Nzeyimana","Kayitesi","Uwimana","Habimana",
  "Nkurunziza","Ndayisenga","Muhire","Nsanzimana","Rugamba","Mutabazi","Rutaganda",
  "Kagame","Gahongayire","Nyiraminani","Mukamana","Mukankusi","Mukarutabana",
  "Nkusi","Rwagatare","Nsengiyumva","Niyibizi","Munyakazi","Ruzindana","Rusagara",
];

// ─── Locations ────────────────────────────────────────────────────────────────

const LOCATIONS = [
  "Kigali, Rwanda","Nairobi, Kenya","Lagos, Nigeria","Accra, Ghana",
  "Cape Town, South Africa","Johannesburg, South Africa","Addis Ababa, Ethiopia",
  "Dar es Salaam, Tanzania","Kampala, Uganda","Cairo, Egypt","Casablanca, Morocco",
  "Dakar, Senegal","Abidjan, Côte d'Ivoire","Douala, Cameroon","Lusaka, Zambia",
  "Harare, Zimbabwe","Maputo, Mozambique","Luanda, Angola","Conakry, Guinea",
  "Paris, France","London, UK","Amsterdam, Netherlands","Berlin, Germany","Zurich, Switzerland",
  "New York, USA","San Francisco, USA","Toronto, Canada","Boston, USA","Seattle, USA",
  "Singapore","Bangalore, India","Mumbai, India","Delhi, India","Hyderabad, India",
  "Dubai, UAE","Riyadh, Saudi Arabia","Doha, Qatar","Tel Aviv, Israel",
  "São Paulo, Brazil","Buenos Aires, Argentina","Mexico City, Mexico",
  "Sydney, Australia","Melbourne, Australia","Auckland, New Zealand",
];

// ─── Companies ───────────────────────────────────────────────────────────────

const COMPANIES = {
  tech: [
    "Google","Microsoft","Amazon","Meta","Apple","Netflix","Uber","Airbnb","Stripe",
    "Palantir","Databricks","Snowflake","Cloudera","Splunk","Elastic","DataRobot",
    "H2O.ai","Alteryx","Tableau","MicroStrategy","ThoughtSpot","Qlik","Looker",
    "OpenAI","Anthropic","Cohere","Scale AI","Hugging Face","Weights & Biases",
    "Andela","Flutterwave","Paystack","Jumia","Konga","Interswitch","Cellulant",
    "Safaricom","MTN Group","Airtel Africa","Orange","Vodacom","Econet",
    "iROKO","Twiga Foods","Copia","Sokowatch","Apollo Agriculture","Sendy",
    "DataSpark","AnalyticsIQ","Sigma Computing","Fivetran","dbt Labs","Airbyte",
  ],
  finance: [
    "JP Morgan","Goldman Sachs","Morgan Stanley","Citi","Deutsche Bank","HSBC",
    "Equity Bank","KCB Bank","Stanbic","Standard Bank","Absa","UBA","Zenith Bank",
    "Access Bank","GTBank","First Bank","Bank of Africa","I&M Bank","BPR",
    "IMF","World Bank","African Development Bank","IFC","EBRD","OPIC",
    "Deloitte","PwC","EY","KPMG","McKinsey","BCG","Bain","Accenture","Oliver Wyman",
  ],
  research: [
    "Rwanda Coding Academy","Carnegie Mellon Africa","ALX Africa","Ashesi University",
    "University of Cape Town","University of Nairobi","Makerere University",
    "Strathmore University","AIMS Rwanda","CERN","MIT","Stanford","Oxford","Cambridge",
    "INRIA","Max Planck Institute","Mila Quebec AI Institute","Vector Institute",
    "Alan Turing Institute","DeepMind","Google Brain","Meta AI Research","OpenAI Research",
  ],
  gov: [
    "Rwanda Revenue Authority","MINECOFIN","RISA","NISR","RDB","City of Kigali",
    "Kenya National Bureau of Statistics","NITA-U","ONDD","Ghana Statistical Service",
    "World Health Organisation","UNICEF","UNDP","WFP","WHO Africa","CDC Africa",
  ],
};

const ALL_COMPANIES = Object.values(COMPANIES).flat();

// ─── Skills matrix ────────────────────────────────────────────────────────────

const SKILL_POOLS = {
  core_ds: [
    {name:"Python",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5,6,7,8]},
    {name:"R",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5,6]},
    {name:"SQL",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5,6,7]},
    {name:"Machine Learning",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5,6,7]},
    {name:"Deep Learning",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"Statistics",levels:["Intermediate","Advanced","Expert"],yoe:[3,4,5,6,7]},
    {name:"Data Visualization",levels:["Intermediate","Advanced"],yoe:[2,3,4,5]},
    {name:"Feature Engineering",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"NLP",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"Computer Vision",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Time Series Analysis",levels:["Intermediate","Advanced"],yoe:[2,3,4,5]},
  ],
  ml_frameworks: [
    {name:"TensorFlow",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"PyTorch",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"Scikit-learn",levels:["Advanced","Expert"],yoe:[3,4,5,6]},
    {name:"Keras",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"XGBoost",levels:["Advanced","Expert"],yoe:[3,4,5]},
    {name:"LightGBM",levels:["Advanced","Expert"],yoe:[3,4,5]},
    {name:"Hugging Face",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"MLflow",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Kubeflow",levels:["Intermediate","Advanced"],yoe:[2,3]},
  ],
  data_eng: [
    {name:"Apache Spark",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"Kafka",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Airflow",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"ETL Pipelines",levels:["Advanced","Expert"],yoe:[3,4,5,6]},
    {name:"dbt",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Scala",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Hadoop",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Flink",levels:["Intermediate","Advanced"],yoe:[2,3]},
  ],
  cloud: [
    {name:"AWS",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"GCP",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Azure",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"BigQuery",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Redshift",levels:["Intermediate","Advanced"],yoe:[2,3]},
    {name:"Databricks",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Snowflake",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Docker",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Kubernetes",levels:["Intermediate","Advanced"],yoe:[2,3]},
  ],
  bi: [
    {name:"Power BI",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"Tableau",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"Looker",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"QlikView",levels:["Intermediate","Advanced"],yoe:[2,3]},
    {name:"Metabase",levels:["Intermediate","Advanced"],yoe:[2,3]},
  ],
  db: [
    {name:"PostgreSQL",levels:["Intermediate","Advanced","Expert"],yoe:[2,3,4,5]},
    {name:"MongoDB",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"MySQL",levels:["Intermediate","Advanced"],yoe:[2,3,4,5]},
    {name:"Neo4j",levels:["Intermediate","Advanced"],yoe:[2,3]},
    {name:"Elasticsearch",levels:["Intermediate","Advanced"],yoe:[2,3]},
    {name:"Redis",levels:["Intermediate","Advanced"],yoe:[2,3]},
  ],
  non_ds: [
    {name:"Java",levels:["Advanced","Expert"],yoe:[4,5,6,7]},
    {name:"React",levels:["Advanced","Expert"],yoe:[3,4,5]},
    {name:"Node.js",levels:["Advanced","Expert"],yoe:[3,4,5]},
    {name:"Spring Boot",levels:["Advanced","Expert"],yoe:[3,4,5]},
    {name:"Angular",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Vue.js",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"PHP",levels:["Advanced","Expert"],yoe:[4,5,6]},
    {name:"C#",levels:["Advanced","Expert"],yoe:[4,5,6]},
    {name:"C++",levels:["Advanced","Expert"],yoe:[4,5,6]},
    {name:"Swift",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Kotlin",levels:["Intermediate","Advanced"],yoe:[2,3,4]},
    {name:"Unity","levels":["Intermediate","Advanced"],yoe:[2,3,4]},
  ],
};

// ─── Archetype definitions ────────────────────────────────────────────────────

const ARCHETYPES = [
  // ── Strong fits ────────────────────────────────────────────
  {
    id:"senior_ds",label:"Senior Data Scientist",weight:8,
    headline:["Senior Data Scientist | ML & AI Systems","Lead Data Scientist | Predictive Modelling","Principal Data Scientist | NLP & Computer Vision","Data Science Lead | Enterprise AI"],
    bio:["Impact-driven Senior Data Scientist with {yoe}+ years building production ML systems across finance, health, and government sectors. Delivered measurable business value through advanced modelling and real-time analytics.",
         "Seasoned Data Scientist specialising in end-to-end ML pipelines, model deployment, and large-scale statistical analysis. Proven track record in deploying models that serve millions of users.",
         "Senior Data Scientist with deep expertise in NLP, computer vision, and generative AI. Published researcher with hands-on experience shipping ML models at scale on cloud platforms.",
         "Data Science leader with {yoe} years of experience translating complex datasets into strategic insights. Expert in stakeholder communication, hypothesis-driven research, and MLOps."],
    rolePool:["Senior Data Scientist","Lead Data Scientist","Principal Data Scientist","Staff Data Scientist","Data Science Lead"],
    deptPool:["Data Science","AI & ML","Research","Advanced Analytics"],
    skillGroups:["core_ds","ml_frameworks","cloud","db"],
    skillCount:[5,7],
    yoeRange:[5,10],
    eduDegrees:["Master's","PhD","Bachelor's"],
    eduFields:["Computer Science","Statistics","Applied Mathematics","Data Science","Physics","Computational Biology"],
    fitLevel:"strong",
  },
  {
    id:"ml_engineer",label:"ML Engineer",weight:6,
    headline:["Machine Learning Engineer | MLOps & Model Deployment","ML Engineer | Deep Learning & NLP","Senior ML Engineer | AI Infrastructure","ML Platform Engineer | Scalable AI Systems"],
    bio:["Machine Learning Engineer with {yoe} years building and deploying production ML systems. Specialised in MLOps, model serving, feature stores, and CI/CD for AI.",
         "Experienced ML Engineer bridging research and production. Built scalable training pipelines and model serving infrastructure handling billions of predictions daily.",
         "ML Engineer with strong background in deep learning, transformer models, and distributed training. Passionate about making AI systems reliable and efficient at scale."],
    rolePool:["ML Engineer","Senior ML Engineer","Machine Learning Engineer","Applied Scientist","AI Engineer"],
    deptPool:["Machine Learning","AI Platform","Research Engineering"],
    skillGroups:["core_ds","ml_frameworks","cloud","data_eng"],
    skillCount:[5,7],
    yoeRange:[3,8],
    eduDegrees:["Master's","Bachelor's","PhD"],
    eduFields:["Computer Science","Electrical Engineering","Applied Mathematics","Data Science"],
    fitLevel:"strong",
  },
  {
    id:"data_scientist",label:"Data Scientist",weight:10,
    headline:["Data Scientist | Analytics & Predictive Modelling","Data Scientist | Business Intelligence & ML","Data Scientist | Healthcare Analytics","Data Scientist | Financial Modelling"],
    bio:["Data Scientist with {yoe} years of experience applying statistical and ML techniques to solve real-world business problems. Strong communicator who translates data into actionable recommendations.",
         "Results-oriented Data Scientist skilled in the full data pipeline: from ETL and EDA to model building, validation, and deployment. Experience across FMCG, fintech, and public sector.",
         "Data Scientist passionate about turning raw data into strategic advantages. Proven success in customer segmentation, churn prediction, demand forecasting, and A/B testing."],
    rolePool:["Data Scientist","Senior Data Analyst","Analytics Scientist","Research Scientist","Quantitative Analyst"],
    deptPool:["Data Science","Analytics","Business Intelligence","Research"],
    skillGroups:["core_ds","ml_frameworks","bi","db"],
    skillCount:[4,6],
    yoeRange:[2,7],
    eduDegrees:["Master's","Bachelor's"],
    eduFields:["Statistics","Data Science","Mathematics","Economics","Computer Science"],
    fitLevel:"strong",
  },
  // ── Partial fits ───────────────────────────────────────────
  {
    id:"data_engineer",label:"Data Engineer",weight:7,
    headline:["Data Engineer | Big Data & Cloud Platforms","Senior Data Engineer | Real-Time Pipelines","Data Engineer | ETL & Data Warehousing","Analytics Engineer | dbt & Modern Data Stack"],
    bio:["Data Engineer with {yoe} years architecting large-scale data pipelines, warehouses, and lakehouse solutions. Expert in Spark, Kafka, and cloud-native data platforms.",
         "Senior Data Engineer specialising in real-time streaming analytics and batch processing. Built data infrastructure serving data science teams at scale.",
         "Analytics Engineer bridging data engineering and analytics. Expert in the modern data stack (dbt, Snowflake, Airflow) and enabling self-service analytics."],
    rolePool:["Data Engineer","Senior Data Engineer","Analytics Engineer","Data Platform Engineer","ETL Developer"],
    deptPool:["Data Engineering","Data Platform","Analytics Engineering"],
    skillGroups:["data_eng","cloud","db","core_ds"],
    skillCount:[4,6],
    yoeRange:[2,7],
    eduDegrees:["Bachelor's","Master's"],
    eduFields:["Computer Science","Software Engineering","Information Systems","Statistics"],
    fitLevel:"partial",
  },
  {
    id:"bi_analyst",label:"Business Intelligence Analyst",weight:6,
    headline:["BI Analyst | Dashboards & Data Storytelling","Business Intelligence Analyst | Power BI & Tableau","Senior BI Developer | Enterprise Reporting","Analytics Manager | Business Insights"],
    bio:["Business Intelligence Analyst with {yoe} years delivering actionable dashboards and reports for executive teams. Skilled in Power BI, Tableau, and SQL-based data modelling.",
         "BI Analyst focused on transforming complex datasets into clear, compelling visualisations. Experience in retail, logistics, and financial services.",
         "Senior BI Developer with expertise in building enterprise-grade reporting solutions. Strong in data modelling, DAX, and building self-service analytics environments."],
    rolePool:["BI Analyst","BI Developer","Business Intelligence Analyst","Reporting Analyst","Analytics Manager"],
    deptPool:["Business Intelligence","Analytics","Reporting","Strategy"],
    skillGroups:["bi","db","core_ds"],
    skillCount:[3,5],
    yoeRange:[2,6],
    eduDegrees:["Bachelor's","Master's"],
    eduFields:["Business Administration","Information Systems","Statistics","Finance","Economics"],
    fitLevel:"partial",
  },
  {
    id:"data_analyst",label:"Data Analyst",weight:8,
    headline:["Data Analyst | Insights & Reporting","Junior Data Analyst | SQL & Excel","Data Analyst | Marketing Analytics","Data Analyst | Operations Research"],
    bio:["Data Analyst with {yoe} years supporting decision-making through data collection, analysis, and reporting. Proficient in SQL, Excel, and Python for data manipulation.",
         "Detail-oriented Data Analyst skilled in extracting insights from structured and unstructured data. Experience in A/B testing, cohort analysis, and KPI tracking.",
         "Data Analyst with background in marketing analytics and customer behaviour analysis. Experienced with Google Analytics, Mixpanel, and CRM data systems."],
    rolePool:["Data Analyst","Senior Data Analyst","Junior Data Analyst","Market Research Analyst","Operations Analyst"],
    deptPool:["Analytics","Marketing","Operations","Finance","Strategy"],
    skillGroups:["bi","db","core_ds"],
    skillCount:[3,5],
    yoeRange:[1,5],
    eduDegrees:["Bachelor's","Master's"],
    eduFields:["Statistics","Mathematics","Economics","Business Administration","Psychology"],
    fitLevel:"partial",
  },
  {
    id:"quant_analyst",label:"Quantitative Analyst",weight:4,
    headline:["Quantitative Analyst | Financial Modelling & Risk","Quant Researcher | Algorithmic Trading","Risk Analyst | Statistical Modelling"],
    bio:["Quantitative Analyst with {yoe} years building pricing models, risk frameworks, and algorithmic trading strategies. Strong background in stochastic calculus and applied statistics.",
         "Quant Researcher focused on systematic trading and portfolio optimisation. Experienced with time series modelling, factor models, and backtesting frameworks."],
    rolePool:["Quantitative Analyst","Quant Researcher","Risk Modelling Analyst","Financial Engineer","Actuary"],
    deptPool:["Risk","Quantitative Research","Finance","Investments"],
    skillGroups:["core_ds","ml_frameworks","db"],
    skillCount:[3,5],
    yoeRange:[2,7],
    eduDegrees:["Master's","PhD"],
    eduFields:["Financial Mathematics","Statistics","Physics","Economics","Applied Mathematics"],
    fitLevel:"partial",
  },
  // ── Weak fits ──────────────────────────────────────────────
  {
    id:"junior_ds",label:"Junior / Entry-Level Data Scientist",weight:6,
    headline:["Junior Data Scientist | ML & Analytics","Entry-Level Data Scientist | Python & Statistics","Graduate Data Scientist","Data Science Bootcamp Graduate"],
    bio:["Motivated junior data scientist with a solid foundation in Python, statistics, and machine learning. Currently seeking first professional role in data science.",
         "Recent graduate with hands-on project experience in ML and data analysis. Enthusiastic learner with strong analytical skills developed through academic and personal projects.",
         "Entry-level data scientist with bootcamp and academic experience. Skilled in Python, scikit-learn, and SQL. Eager to grow into a full-time data science role."],
    rolePool:["Junior Data Scientist","Data Science Intern","Graduate Data Analyst","Research Assistant","ML Intern"],
    deptPool:["Data Science","Research","Analytics"],
    skillGroups:["core_ds","ml_frameworks"],
    skillCount:[2,4],
    yoeRange:[0,2],
    eduDegrees:["Bachelor's","Master's"],
    eduFields:["Statistics","Mathematics","Computer Science","Data Science","Physics"],
    fitLevel:"weak",
  },
  {
    id:"researcher",label:"Academic Researcher",weight:3,
    headline:["Research Scientist | ML & AI","Postdoctoral Researcher | Computational Biology","AI Research Fellow","PhD Researcher | Natural Language Processing"],
    bio:["Research Scientist with strong theoretical ML background and peer-reviewed publications. Transitioning from academia to industry data science roles.",
         "Postdoctoral Researcher specialising in computational methods and statistical modelling. Extensive publication record in applied ML and quantitative research.",
         "PhD Researcher with deep expertise in NLP and large language models. Published in top-tier venues including NeurIPS, ICML, and ACL."],
    rolePool:["Research Scientist","Postdoctoral Researcher","PhD Researcher","AI Research Fellow","Research Associate"],
    deptPool:["Research","AI Research","Computational Science"],
    skillGroups:["core_ds","ml_frameworks"],
    skillCount:[3,5],
    yoeRange:[2,6],
    eduDegrees:["PhD","Master's"],
    eduFields:["Computer Science","Statistics","Physics","Computational Biology","Linguistics"],
    fitLevel:"weak",
  },
  {
    id:"biz_analyst",label:"Business Analyst",weight:4,
    headline:["Business Analyst | Process Improvement","Senior Business Analyst | Agile & Requirements","Business Systems Analyst","Management Consultant"],
    bio:["Business Analyst with {yoe} years bridging business and technical teams. Skilled in requirements gathering, process mapping, and stakeholder management.",
         "Senior BA with expertise in Agile delivery, business process modelling, and system requirements. Some exposure to data analytics tools for reporting."],
    rolePool:["Business Analyst","Senior Business Analyst","Systems Analyst","Product Analyst","Management Consultant"],
    deptPool:["Strategy","Operations","Consulting","Product"],
    skillGroups:["bi","db"],
    skillCount:[2,4],
    yoeRange:[2,7],
    eduDegrees:["Bachelor's","Master's","MBA"],
    eduFields:["Business Administration","Finance","Information Systems","Economics","MBA"],
    fitLevel:"weak",
  },
  // ── No fits ────────────────────────────────────────────────
  {
    id:"software_engineer",label:"Software Engineer (No Fit)",weight:5,
    headline:["Senior Software Engineer | Backend & APIs","Full-Stack Developer | React & Node.js","Software Engineer | Cloud & Microservices","DevOps Engineer | CI/CD & Kubernetes"],
    bio:["Software Engineer with {yoe} years building scalable backend systems, RESTful APIs, and microservice architectures. Strong in system design and distributed systems.",
         "Full-stack developer with expertise in React, Node.js, and cloud-native application development. Experience in fintech and e-commerce platforms.",
         "Backend engineer specialised in high-throughput systems, database optimisation, and service reliability. No data science background."],
    rolePool:["Software Engineer","Senior Software Engineer","Full-Stack Developer","Backend Developer","DevOps Engineer"],
    deptPool:["Engineering","Platform","Product Engineering"],
    skillGroups:["non_ds","cloud","db"],
    skillCount:[3,5],
    yoeRange:[2,8],
    eduDegrees:["Bachelor's","Master's"],
    eduFields:["Computer Science","Software Engineering","Information Technology","Electrical Engineering"],
    fitLevel:"no_fit",
  },
  {
    id:"product_manager",label:"Product Manager (No Fit)",weight:3,
    headline:["Product Manager | Agile & Roadmap Strategy","Senior PM | Data Products","Head of Product | Consumer Apps","Director of Product | B2B SaaS"],
    bio:["Product Manager with {yoe} years leading cross-functional teams to deliver user-centric software products. Data-informed decision maker with no hands-on data science.",
         "Experienced PM with background in consumer apps and B2B SaaS. Comfortable with product analytics and SQL queries for basic metrics, but not a data science practitioner."],
    rolePool:["Product Manager","Senior PM","Associate PM","Director of Product","CPO"],
    deptPool:["Product","Strategy","Growth"],
    skillGroups:["bi"],
    skillCount:[1,3],
    yoeRange:[2,8],
    eduDegrees:["Bachelor's","MBA","Master's"],
    eduFields:["Business Administration","Computer Science","Engineering","MBA","Psychology"],
    fitLevel:"no_fit",
  },
  {
    id:"designer",label:"Designer / UX (No Fit)",weight:2,
    headline:["UX/UI Designer | Human-Centred Design","Product Designer | Design Systems","Senior UX Researcher | User Testing"],
    bio:["UX Designer with {yoe} years creating intuitive digital experiences. Skilled in user research, wireframing, and prototyping. No data science background.",
         "Product Designer focused on design systems and scalable UI components. Strong portfolio in consumer apps and enterprise dashboards."],
    rolePool:["UX Designer","Product Designer","UI Designer","UX Researcher","Design Lead"],
    deptPool:["Design","Product","Creative"],
    skillGroups:["bi"],
    skillCount:[1,2],
    yoeRange:[2,6],
    eduDegrees:["Bachelor's","Master's"],
    eduFields:["Graphic Design","Human-Computer Interaction","Fine Arts","Psychology","Communication"],
    fitLevel:"no_fit",
  },
];

// ─── Universities pool ────────────────────────────────────────────────────────

const UNIVERSITIES = [
  "University of Rwanda","Carnegie Mellon University Africa","Makerere University",
  "University of Nairobi","University of Cape Town","Strathmore University",
  "Ashesi University","American University in Cairo","University of Lagos",
  "Massachusetts Institute of Technology","Stanford University","University of Oxford",
  "University of Cambridge","ETH Zurich","EPFL","Université Paris-Saclay",
  "University of Toronto","University of British Columbia","McGill University",
  "National University of Singapore","Nanyang Technological University",
  "Imperial College London","University College London","King's College London",
  "Georgia Tech","Carnegie Mellon University","University of Michigan",
  "Cornell University","Princeton University","Yale University","Harvard University",
  "University of Edinburgh","University of Amsterdam","TU Delft",
  "AIMS Rwanda","AIMS Ghana","AIMS Tanzania","AIMS Senegal","AIMS Cameroon",
  "Institut Polytechnique de Paris","Sorbonne University","HEC Paris",
  "University of Witwatersrand","University of Pretoria","Stellenbosch University",
  "Addis Ababa University","University of Ghana","Kwame Nkrumah University",
  "Covenant University","University of Ibadan","AUCA","INES Ruhengeri",
  "St. Andrews University","University of Warwick","University of Bristol",
  "Politecnico di Milano","Technical University of Munich","KU Leuven",
];

const LANGUAGES_POOL = [
  {name:"English",proficiency:"Fluent"},
  {name:"French",proficiency:"Fluent"},
  {name:"Kinyarwanda",proficiency:"Native"},
  {name:"Swahili",proficiency:"Fluent"},
  {name:"Arabic",proficiency:"Conversational"},
  {name:"Spanish",proficiency:"Conversational"},
  {name:"Mandarin",proficiency:"Conversational"},
  {name:"German",proficiency:"Conversational"},
  {name:"Portuguese",proficiency:"Fluent"},
  {name:"Amharic",proficiency:"Native"},
  {name:"Yoruba",proficiency:"Native"},
  {name:"Igbo",proficiency:"Native"},
  {name:"Hausa",proficiency:"Native"},
  {name:"Twi",proficiency:"Native"},
  {name:"Zulu",proficiency:"Native"},
];

// ─── Project templates ────────────────────────────────────────────────────────

const PROJECT_TEMPLATES = [
  { name:"Customer Churn Prediction", desc:"End-to-end ML pipeline to predict and reduce customer churn using gradient boosting.", techs:["Python","XGBoost","AWS SageMaker"] },
  { name:"Real-Time Fraud Detection", desc:"Streaming fraud detection system processing 50K transactions/second with <10ms latency.", techs:["Kafka","Spark","Python","Redis"] },
  { name:"Demand Forecasting Platform", desc:"Time-series forecasting system improving supply chain accuracy by 34%.", techs:["Python","Prophet","Airflow","GCP"] },
  { name:"NLP Document Classifier", desc:"Multi-label text classification model for legal document processing, 94% accuracy.", techs:["Python","Hugging Face","BERT","FastAPI"] },
  { name:"Computer Vision QA System", desc:"Automated quality assurance system detecting manufacturing defects using CNNs.", techs:["Python","TensorFlow","OpenCV","Azure"] },
  { name:"Recommendation Engine", desc:"Collaborative filtering recommendation system increasing user engagement by 28%.", techs:["Python","Spark ALS","Redis","AWS"] },
  { name:"Geospatial Analytics Dashboard", desc:"Interactive spatial analytics platform for public health policy decisions.", techs:["Python","PostGIS","Kepler.gl","React"] },
  { name:"Credit Scoring Model", desc:"Alternative credit scoring model for unbanked populations using mobile data.", techs:["Python","Scikit-learn","MongoDB","GCP"] },
  { name:"Sentiment Analysis API", desc:"Production NLP API for social media sentiment analysis serving 10M requests/day.", techs:["Python","Transformers","FastAPI","Docker"] },
  { name:"Data Lakehouse Architecture", desc:"Enterprise data lake migration from on-prem to cloud-native architecture.", techs:["Databricks","Delta Lake","Spark","Azure"] },
  { name:"Clinical Trial Analytics", desc:"Statistical analysis platform for Phase III clinical trial data processing.", techs:["R","Python","SAS","PostgreSQL"] },
  { name:"Supply Chain Optimisation", desc:"Network optimisation model reducing logistics costs by 22% using operations research.", techs:["Python","OR-Tools","Tableau","SQL"] },
  { name:"Financial Reporting Automation", desc:"Automated financial consolidation and reporting system replacing 40 manual hours/month.", techs:["Python","Power BI","SQL","Azure"] },
  { name:"A/B Testing Framework", desc:"In-house experimentation platform for statistically rigorous A/B testing.", techs:["Python","PostgreSQL","React","FastAPI"] },
  { name:"Energy Consumption Forecasting", desc:"LSTM-based load forecasting for national grid optimisation.", techs:["Python","TensorFlow","InfluxDB","Grafana"] },
  { name:"Social Network Analysis", desc:"Graph-based analysis of financial transaction networks for AML compliance.", techs:["Python","Neo4j","NetworkX","Gephi"] },
  { name:"Healthcare Triage Model", desc:"ML model for patient triage priority in resource-constrained hospital settings.", techs:["Python","Scikit-learn","FastAPI","PostgreSQL"] },
  { name:"Price Optimisation Engine", desc:"Dynamic pricing model using reinforcement learning for e-commerce platform.", techs:["Python","Ray RLlib","Kafka","AWS"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
function nextSeq() { return ++_seq; }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randBool(p = 0.5) { return Math.random() < p; }

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function generateEmail(first, last, seq) {
  const domains = ["gmail.com","yahoo.com","outlook.com","hotmail.com","protonmail.com","icloud.com"];
  const patterns = [
    `${slugify(first)}.${slugify(last)}@${pick(domains)}`,
    `${slugify(first)}${slugify(last)}@${pick(domains)}`,
    `${slugify(first)}.${slugify(last)}${seq}@${pick(domains)}`,
    `${slugify(last)}.${slugify(first)}@${pick(domains)}`,
    `${slugify(first[0])}${slugify(last)}@${pick(domains)}`,
    `${slugify(first)}${seq}@${pick(domains)}`,
  ];
  return pick(patterns);
}

function generateSkills(archetype) {
  const skills = [];
  const seenNames = new Set();
  const count = randInt(archetype.skillCount[0], archetype.skillCount[1]);

  // Mix from specified groups
  for (const grpName of archetype.skillGroups) {
    const grp = SKILL_POOLS[grpName] || [];
    for (const s of grp) {
      if (skills.length >= count + 2) break;
      if (seenNames.has(s.name)) continue;
      if (Math.random() < 0.6) {
        const level = pick(s.levels);
        const yoe = pick(s.yoe);
        skills.push({ name: s.name, level, yearsOfExperience: yoe });
        seenNames.add(s.name);
      }
    }
  }

  // Trim to count
  while (skills.length > count) skills.pop();
  // Ensure at least 1
  if (skills.length === 0) {
    const grp = SKILL_POOLS[archetype.skillGroups[0]] || [];
    if (grp.length > 0) {
      const s = pick(grp);
      skills.push({ name: s.name, level: pick(s.levels), yearsOfExperience: pick(s.yoe) });
    }
  }
  return skills;
}

function generateExperience(archetype) {
  const count = randInt(1, 3);
  const exp = [];
  let currentYear = 2025;

  for (let i = 0; i < count; i++) {
    const durationYears = randInt(1, 3);
    const endYear = currentYear;
    const startYear = endYear - durationYears;
    const isCurrent = i === 0;
    const company = pick(ALL_COMPANIES);
    const role = pick(archetype.rolePool);

    const startDate = `${startYear}-${String(randInt(1, 12)).padStart(2, "0")}`;
    const endDate = isCurrent ? "Present" : `${endYear}-${String(randInt(1, 12)).padStart(2, "0")}`;

    const techs = pickN(
      Object.values(SKILL_POOLS).flat().map(s => s.name),
      randInt(2, 4)
    );

    const descs = [
      `Built scalable ${pick(archetype.deptPool).toLowerCase()} systems serving ${randInt(10, 500)}K+ users.`,
      `Led a team of ${randInt(2, 8)} to deliver key ${pick(archetype.deptPool).toLowerCase()} initiatives on time and budget.`,
      `Designed and implemented ML pipelines reducing processing time by ${randInt(15, 60)}%.`,
      `Developed ETL workflows processing ${randInt(1, 50)}TB of data daily.`,
      `Collaborated with cross-functional teams to define KPIs and analytics roadmap.`,
      `Delivered ${randInt(3, 12)} end-to-end data products from ideation to production.`,
      `Improved model accuracy by ${randInt(5, 30)}% through feature engineering and hyperparameter tuning.`,
      `Built real-time dashboards tracking ${randInt(10, 100)} business metrics for senior leadership.`,
      `Migrated legacy reporting systems to cloud-native architecture, saving $${randInt(50, 300)}K/year.`,
      `Mentored ${randInt(2, 6)} junior data scientists and conducted regular code reviews.`,
    ];

    exp.push({
      company,
      role,
      "Start Date": startDate,
      "End Date": endDate,
      description: pick(descs),
      technologies: techs,
      "Is Current": isCurrent,
    });

    currentYear = startYear - randInt(0, 1);
  }
  return exp;
}

function generateEducation(archetype) {
  const degree = pick(archetype.eduDegrees);
  const field = pick(archetype.eduFields);
  const uni = pick(UNIVERSITIES);
  const endYear = randInt(2018, 2025);
  const duration = degree === "PhD" ? 4 : degree === "Master's" ? 2 : 4;
  return [{
    institution: uni,
    degree,
    "Field of Study": field,
    "Start Year": endYear - duration,
    "End Year": endYear,
  }];
}

function generateProjects(archetype) {
  if (archetype.fitLevel === "no_fit") return [];
  const count = randInt(0, 2);
  const projs = [];
  const pool = [...PROJECT_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, count);
  for (const p of pool) {
    const startYear = randInt(2021, 2024);
    const endYear = startYear + randInt(0, 1);
    projs.push({
      name: p.name,
      description: p.desc,
      technologies: p.techs,
      role: pick(["Lead","Developer","Contributor","Architect","Researcher"]),
      link: `https://github.com/project-${randInt(1000, 9999)}`,
      "Start Date": `${startYear}-${String(randInt(1, 12)).padStart(2, "0")}`,
      "End Date": endYear === 2024 && Math.random() < 0.3 ? "Present" : `${endYear}-${String(randInt(1, 12)).padStart(2, "0")}`,
    });
  }
  return projs;
}

function generateLanguages() {
  const base = [{ name: "English", proficiency: pick(["Fluent","Native","Conversational"]) }];
  const extras = [...LANGUAGES_POOL].filter(l => l.name !== "English").sort(() => Math.random() - 0.5).slice(0, randInt(0, 2));
  return [...base, ...extras];
}

function generateAvailability(archetype) {
  const statuses = {
    strong:  ["Open to Opportunities","Available"],
    partial: ["Open to Opportunities","Available","Actively Looking"],
    weak:    ["Available","Actively Looking","Open to Opportunities"],
    no_fit:  ["Not Available","Open to Opportunities","Available"],
  };
  const types = {
    strong:  ["Full-time"],
    partial: ["Full-time","Contract"],
    weak:    ["Full-time","Internship","Contract"],
    no_fit:  ["Full-time","Contract"],
  };
  return {
    status: pick(statuses[archetype.fitLevel] || ["Open to Opportunities"]),
    type: pick(types[archetype.fitLevel] || ["Full-time"]),
  };
}

// ─── Pick archetype by weighted random ───────────────────────────────────────

function buildWeightedPool() {
  const pool = [];
  for (const a of ARCHETYPES) {
    for (let i = 0; i < a.weight; i++) pool.push(a);
  }
  return pool;
}

const WEIGHTED_POOL = buildWeightedPool();

// ─── Generate one candidate ───────────────────────────────────────────────────

const usedEmails = new Set();

function generateCandidate(indexHint) {
  const archetype = pick(WEIGHTED_POOL);
  const seq = nextSeq();
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const yoe = randInt(archetype.yoeRange[0], archetype.yoeRange[1]);

  let email;
  let attempts = 0;
  do {
    email = generateEmail(firstName, lastName, seq + attempts);
    attempts++;
  } while (usedEmails.has(email) && attempts < 10);
  usedEmails.add(email);

  const headlineTemplate = pick(archetype.headline);
  const bioTemplate = pick(archetype.bio);
  const headline = headlineTemplate;
  const bio = bioTemplate.replace(/\{yoe\}/g, String(yoe));

  return {
    firstName,
    lastName,
    email,
    headline,
    bio,
    location: pick(LOCATIONS),
    skills: generateSkills(archetype),
    languages: generateLanguages(),
    experience: generateExperience(archetype),
    education: generateEducation(archetype),
    projects: generateProjects(archetype),
    availability: generateAvailability(archetype),
  };
}

// ─── Generate set ─────────────────────────────────────────────────────────────

function generateSet(count) {
  const candidates = [];
  for (let i = 0; i < count; i++) {
    candidates.push(generateCandidate(i));
  }
  return { candidates };
}

// ─── Write files ──────────────────────────────────────────────────────────────

const SIZES = [50, 150, 500, 1000, 2000];
const OUT_DIR = __dirname;

console.log("Generating candidate test datasets...\n");

for (const size of SIZES) {
  const filename = `${OUT_DIR}/candidates-${size}.json`;
  const data = generateSet(size);
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
  const fileSizeKB = Math.round(fs.statSync(filename).size / 1024);
  console.log(`✅ candidates-${size}.json  — ${size} candidates, ${fileSizeKB} KB`);
}

console.log("\n🎉 All files generated in:", OUT_DIR);
console.log("\nFit distribution per file:");
console.log("  ~23% Strong fit  (Senior DS, ML Engineer, Data Scientist)");
console.log("  ~36% Partial fit (Data Engineer, BI Analyst, Data Analyst, Quant)");
console.log("  ~23% Weak fit    (Junior DS, Researcher, Business Analyst)");
console.log("  ~18% No fit      (Software Engineer, PM, Designer)");
console.log("\nUse the bulk import endpoint: POST /api/candidates/bulk");
