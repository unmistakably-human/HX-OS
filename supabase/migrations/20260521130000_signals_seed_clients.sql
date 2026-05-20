-- HumanX Signals — seed the active client roster.
--
-- Sourced from humanx.io/work + a list of currently-active engagements the
-- design team confirmed. Twelve clients on the daily Signals stream — a
-- focused number that keeps the daily Claude refresh affordable AND lets the
-- domain-nav stay scannable. Additional clients from the full work-page list
-- can be added later in Supabase Studio (just `update signals_meta set data
-- = jsonb_set(...)`); the schema is identical.
--
-- Idempotent: only seeds when no clients have been configured yet. Admin
-- edits via Studio after the seed are preserved on subsequent deploys.

update public.signals_meta
set data = jsonb_build_object(
  'last_full_refresh', null,
  'section_freshness', coalesce(data->'section_freshness', '{}'::jsonb),
  'clients', jsonb_build_array(

    -- Amazon umbrella (4 product surfaces) ----------------------------------
    jsonb_build_object(
      'id', 'amazon-now',
      'name', 'Amazon Now',
      'tagline', 'Amazon''s 10-minute quick-commerce arm in India',
      'color', '#FF9900',
      'tags', jsonb_build_array(
        'quick-commerce', '10-minute-delivery', 'dark-stores',
        'groceries', 'essentials', 'india'
      ),
      'competitors', jsonb_build_array(
        'Blinkit', 'Zepto', 'Swiggy Instamart', 'Tata Big Basket Now', 'Flipkart Minutes'
      ),
      'leader_handles', jsonb_build_array('@amazonIN', '@flipkart'),
      'subreddit_watchlist', jsonb_build_array(
        'r/india', 'r/bangalore', 'r/mumbai', 'r/delhi'
      )
    ),

    jsonb_build_object(
      'id', 'amazon-medical',
      'name', 'Amazon Medical',
      'tagline', 'Amazon''s medicine + healthcare delivery platform (Amazon Pharmacy India)',
      'color', '#FF9900',
      'tags', jsonb_build_array(
        'pharmacy', 'medicine-delivery', 'OTC', 'prescription',
        'healthcare', 'telehealth', 'chronic-care'
      ),
      'competitors', jsonb_build_array(
        '1mg', 'PharmEasy', 'Apollo 24|7', 'Netmeds', 'Truemeds', 'MediBuddy'
      ),
      'leader_handles', jsonb_build_array('@amazonIN'),
      'subreddit_watchlist', jsonb_build_array(
        'r/india', 'r/IndianFitnessNutri', 'r/SkincareAddiction'
      )
    ),

    jsonb_build_object(
      'id', 'amazon-bazaar',
      'name', 'Amazon Bazaar',
      'tagline', 'Amazon''s value-fashion marketplace for tier-2/3 India',
      'color', '#FF9900',
      'tags', jsonb_build_array(
        'value-fashion', 'low-cost-fashion', 'tier-2-india', 'tier-3-india',
        'vernacular', 'marketplace', 'commerce'
      ),
      'competitors', jsonb_build_array(
        'Meesho', 'Flipkart Shopsy', 'Snapdeal', 'Ajio Street', 'Myntra Now'
      ),
      'leader_handles', jsonb_build_array('@amazonIN'),
      'subreddit_watchlist', jsonb_build_array(
        'r/india', 'r/IndianFashionAddicts'
      )
    ),

    jsonb_build_object(
      'id', 'amazon-smartbiz',
      'name', 'Amazon SmartBiz',
      'tagline', 'Amazon''s B2B e-commerce + tools platform for SMBs and MSMEs',
      'color', '#FF9900',
      'tags', jsonb_build_array(
        'B2B-commerce', 'SMB-tools', 'inventory-management',
        'seller-platform', 'MSME', 'wholesale'
      ),
      'competitors', jsonb_build_array(
        'Udaan', 'ShopX', 'ElasticRun', 'Reliance JioMart Business', 'Flipkart Wholesale'
      ),
      'leader_handles', jsonb_build_array('@amazonIN'),
      'subreddit_watchlist', jsonb_build_array(
        'r/StartUpIndia', 'r/IndianBusiness'
      )
    ),

    -- SBI umbrella (3 product surfaces) -------------------------------------
    jsonb_build_object(
      'id', 'sbi-paisa-genie',
      'name', 'SBI Paisa Genie',
      'tagline', 'SBI''s robo-advisory + wealth planning platform',
      'color', '#22336B',
      'tags', jsonb_build_array(
        'wealth-management', 'robo-advisor', 'mutual-funds',
        'retail-investing', 'SIP', 'goal-planning', 'PMS'
      ),
      'competitors', jsonb_build_array(
        'INDmoney', 'Groww Wealth', 'ETMoney', 'Kuvera',
        'Zerodha Coin', 'Paytm Wealth', '360 ONE'
      ),
      'leader_handles', jsonb_build_array('@TheOfficialSBI', '@SEBI_India', '@RBI'),
      'subreddit_watchlist', jsonb_build_array(
        'r/IndiaInvestments', 'r/personalfinanceindia', 'r/IndianStreetBets'
      )
    ),

    jsonb_build_object(
      'id', 'sbi-yono-nb',
      'name', 'SBI YONO NB',
      'tagline', 'SBI''s net-banking experience inside the YONO super-app',
      'color', '#22336B',
      'tags', jsonb_build_array(
        'retail-banking', 'net-banking', 'digital-banking',
        'super-app', 'UPI', 'payments', 'KYC'
      ),
      'competitors', jsonb_build_array(
        'HDFC Mobile Banking', 'ICICI iMobile', 'Axis Mobile',
        'Kotak 811', 'PhonePe', 'Google Pay', 'CRED'
      ),
      'leader_handles', jsonb_build_array('@TheOfficialSBI', '@RBI', '@NPCI_NPCI'),
      'subreddit_watchlist', jsonb_build_array(
        'r/personalfinanceindia', 'r/IndianStreetBets', 'r/india'
      )
    ),

    jsonb_build_object(
      'id', 'sbi-life',
      'name', 'SBI Life',
      'tagline', 'SBI''s life insurance arm (term, ULIP, endowment, retirement)',
      'color', '#22336B',
      'tags', jsonb_build_array(
        'life-insurance', 'term-insurance', 'ULIP',
        'retirement', 'endowment', 'claims-experience'
      ),
      'competitors', jsonb_build_array(
        'HDFC Life', 'LIC', 'ICICI Prudential Life',
        'Max Life', 'Bajaj Allianz Life', 'Tata AIA'
      ),
      'leader_handles', jsonb_build_array('@SBILife', '@IRDAINews'),
      'subreddit_watchlist', jsonb_build_array(
        'r/personalfinanceindia', 'r/IndiaInvestments'
      )
    ),

    -- HDFC AMC -------------------------------------------------------------
    jsonb_build_object(
      'id', 'hdfc-amc',
      'name', 'HDFC AMC (MME)',
      'tagline', 'HDFC AMC mutual-fund + retail-investor platform',
      'color', '#002F6C',
      'tags', jsonb_build_array(
        'mutual-funds', 'AMC', 'SIP', 'retail-investing',
        'wealth', 'ETF', 'NFO'
      ),
      'competitors', jsonb_build_array(
        'SBI Mutual Funds', 'ICICI Pru MF', 'Nippon India MF',
        'Axis MF', 'Kotak MF', 'DSP MF', 'Mirae Asset'
      ),
      'leader_handles', jsonb_build_array('@HDFCMF_News', '@SEBI_India', '@AMFIIndia'),
      'subreddit_watchlist', jsonb_build_array(
        'r/IndiaInvestments', 'r/personalfinanceindia'
      )
    ),

    -- Reliance Brands (Mothercare + Hamleys) --------------------------------
    jsonb_build_object(
      'id', 'mothercare',
      'name', 'Mothercare',
      'tagline', 'Mom-and-baby brand operated by Reliance Brands in India',
      'color', '#E63946',
      'tags', jsonb_build_array(
        'mother-and-baby', 'maternity', 'infant-products',
        'kidswear', 'newborn', 'festive', 'phygital-retail'
      ),
      'competitors', jsonb_build_array(
        'FirstCry', 'Hopscotch', 'Babyhug', 'Chicco',
        'The Souled Store Kids', 'H&M Kids'
      ),
      'leader_handles', jsonb_build_array('@MothercareIndia', '@ril_updates'),
      'subreddit_watchlist', jsonb_build_array(
        'r/IndianMakeupAddicts', 'r/india', 'r/Parenting'
      )
    ),

    jsonb_build_object(
      'id', 'hamleys',
      'name', 'Hamleys',
      'tagline', 'Toy retail with theatrical in-store moments; Reliance Brands operates India + global',
      'color', '#C8102E',
      'tags', jsonb_build_array(
        'toys', 'kidswear', 'experiential-retail',
        'festive', 'in-store-theatre', 'phygital', 'edutainment'
      ),
      'competitors', jsonb_build_array(
        'FirstCry Toys', 'Toys R Us India (Tata)', 'Lego India',
        'Funskool', 'Hopscotch Toys'
      ),
      'leader_handles', jsonb_build_array('@hamleysindia', '@ril_updates'),
      'subreddit_watchlist', jsonb_build_array(
        'r/india', 'r/Parenting', 'r/IndianTeenagers'
      )
    ),

    -- JuiceLabs AI (internal / parent) --------------------------------------
    jsonb_build_object(
      'id', 'juicelabs-ai',
      'name', 'JuiceLabs AI',
      'tagline', 'HumanX Labs'' parent — AI-design platform for agentic creative work',
      'color', '#FFC700',
      'tags', jsonb_build_array(
        'AI-design', 'generative-design', 'agent-UX',
        'AI-first-products', 'design-tools', 'creative-AI', 'design-systems'
      ),
      'competitors', jsonb_build_array(
        'Figma AI', 'Vercel v0', 'Cursor',
        'Magic Patterns', 'Galileo AI', 'Lovable', 'Bolt.new', 'Tldraw Make Real'
      ),
      'leader_handles', jsonb_build_array(
        '@vercel', '@figma', '@AnthropicAI', '@cursor_ai', '@runwayml'
      )
    ),

    -- Seclore (B2B data security) ------------------------------------------
    jsonb_build_object(
      'id', 'seclore',
      'name', 'Seclore',
      'tagline', 'Data-centric security: DRM, IP protection, file-rights management for enterprises',
      'color', '#0F4C81',
      'tags', jsonb_build_array(
        'data-security', 'DRM', 'enterprise-security',
        'IP-protection', 'zero-trust', 'DLP', 'compliance'
      ),
      'competitors', jsonb_build_array(
        'Microsoft Purview', 'Vera by HelpSystems', 'Fortra Digital Guardian',
        'Forcepoint', 'Symantec DLP', 'Virtru'
      ),
      'leader_handles', jsonb_build_array('@SecloreIRM')
    )

  ),
  'cross_domain_voices', jsonb_build_array(
    jsonb_build_object('handle', '@brian_lovin', 'name', 'Brian Lovin', 'role', 'Design leader at GitHub'),
    jsonb_build_object('handle', '@jennywen_ux', 'name', 'Jenny Wen', 'role', 'Designer at Linear, ex-Figma'),
    jsonb_build_object('handle', '@soleio', 'name', 'Soleio', 'role', 'VC / former Facebook design'),
    jsonb_build_object('handle', '@JulieZhuo', 'name', 'Julie Zhuo', 'role', 'Founder Sundial, ex-Facebook design'),
    jsonb_build_object('handle', '@pasql', 'name', 'Pasquale D''Silva', 'role', 'Designer and animator'),
    jsonb_build_object('handle', '@rauchg', 'name', 'Guillermo Rauch', 'role', 'CEO Vercel'),
    jsonb_build_object('handle', '@dhh', 'name', 'David Heinemeier Hansson', 'role', '37signals / Hey'),
    jsonb_build_object('handle', '@lennysan', 'name', 'Lenny Rachitsky', 'role', 'Product / newsletter and podcast')
  )
)
where id = 'singleton'
  and (data->'clients' is null or jsonb_array_length(data->'clients') = 0);
