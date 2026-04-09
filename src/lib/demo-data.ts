import type { ProductContext, Feature } from "./types";

export const DEMO_CONTEXT: ProductContext = {
  productName: "Perfora",
  company: "Perfora Oral Care",
  productType: "ecommerce",
  stage: "growth",
  industries: ["E-commerce & Retail", "Healthcare & Wellness"],
  audience: "tier1",
  platform: "responsive",
  explain:
    "An online store selling premium oral care products — electric toothbrushes, whitening strips, specialty toothpaste. Users browse products, read about ingredients and science behind them, compare options, and purchase. The app educates users about oral health while selling products.",
  briefWhy:
    "Redesign the product detail page — highest-traffic page but lowest conversion rate. Users browse but don't buy.",
  valueProp:
    "Perfora combines clinical-grade oral care with modern Indian aesthetics. Unlike pharmacy brands, every product explains its science in plain language. Unlike imported premium brands, pricing is accessible for urban millennials.",
  notThis:
    "NOT a dental clinic booking platform. NOT a subscription box (though subscriptions exist). NOT a marketplace — Perfora only sells its own products.",
  clientBrief:
    "Recent user interviews: 60% of visitors read ingredient lists but only 15% understand them. Top drop-off is the product page — users add to wishlist but not cart.",
  seg1: {
    name: "Ingredient-conscious millennials, 24-34",
    age: "24-34",
    gender: "60% female, 40% male",
    loc: "Mumbai, Delhi, Bangalore",
    income: "₹6-15L/year",
    behaviour:
      "Reads ingredient lists on every product. Compares with international brands. Screenshots products and shares on WhatsApp before buying. Shops at 10PM-12AM. Follows skincare influencers.",
  },
  seg2: {
    name: "Gift-buying professionals, 28-40",
    age: "28-40",
    gender: "Mixed",
    loc: "Tier 1 metros",
    income: "₹10-25L/year",
    behaviour:
      "Buys oral care as premium gifts. Doesn't read ingredients — trusts brand aesthetic. Under 2 minutes per purchase. Values packaging. Repeat buyer once a quarter.",
  },
  behInsights:
    "Cart abandonment 73%. Users who view 3+ products convert 4x. 80% mobile. Avg session 2.4 min. Users who read 'Science' section convert 2.3x better.",
  competitors:
    "Colgate Vedshakti — trusted but clinical. Sensodyne — premium but zero education. Curaprox — loved by dentists, unknown to consumers. Spotlight Oral Care (Ireland) — excellent science storytelling.",
  flows:
    "1. Browse → Filter by concern → View product → Read science → Add to cart → Checkout\n2. Search → Product detail → Quick add\n3. WhatsApp link → Product page → Purchase\n4. Reorder from history → Quick checkout",
  ia: "Home\n├── Shop (grid → PDP)\n├── Science (ingredient library)\n├── Bundles\n├── Blog\n├── Cart → Checkout\n└── Account (orders, addresses, subscriptions)",
  figmaLink: "",
  upcoming:
    "Subscription management next month. Dentist recommendation program Q3. Hindi support planned.",
  dsChoice: "describe",
  vibe: "Clean like Glossier, scientific like The Ordinary, but warmer and more Indian. White space with mint green and coral pops.",
  colors: "Primary: #2EC4B6 (mint/teal). Secondary: #FF6B6B (coral). Dark: #1A1A2E",
  fonts: "Headings: DM Sans Bold. Body: DM Sans Regular. Science: JetBrains Mono",
};

export const DEMO_FEATURE: Omit<Feature, "id"> = {
  name: "Product Detail Page",
  type: "screen",
  problem:
    "Highest-traffic page but lowest conversion. Users browse ingredients but don't add to cart. Need to bridge the trust gap between reading and buying.",
  mustHave:
    "Product images, price, add to cart, ingredient list with explanations, science section, reviews, related products",
  notBe:
    "Not a comparison page. Not a long-scroll blog post. Not a generic e-commerce PDP template.",
  context: "",
  chosenConcept: null,
  chatMessages: [],
};
