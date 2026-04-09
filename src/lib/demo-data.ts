import type { ProductContext } from "./types";

export const DEMO_CONTEXT: ProductContext = {
  productName: "Perfora",
  company: "Perfora Oral Care",
  productType: "ecommerce",
  stage: "growth",
  industries: ["E-commerce & Retail", "Healthcare & Wellness"],
  audience: "allIndia",
  platform: "responsive",
  explain:
    "You open the website and see toothbrushes and toothpastes, but they look fancy — like skincare. Each product page shows ingredients with science explanations. You can read real dentist reviews. You add stuff to cart and check out with UPI or card. Your order arrives in a Perfora box with a thank-you note.",
  briefWhy:
    "Their traffic is growing (3× in 6 months via influencer campaigns and dental partnerships) but conversion is low. The current website feels generic — it doesn't communicate the science-backed premium positioning that justifies the price.",
  valueProp:
    "People choose Perfora because it's the only Indian oral care brand that combines cosmetic-grade packaging with clinical-grade ingredients, verified by real dentists.",
  notThis:
    "Not a Colgate/Oral-B mass-market brand. Not a luxury brand like Marvis. Not a subscription-first model like Quip.",
  clientBrief:
    "Perfora wants to 2× their online conversion rate within 6 months. Their hypothesis: users trust the brand but the website doesn't close the sale. Key insight from Hotjar: users spend avg 45s on PDP but only 3% add to cart.",
  seg1: {
    name: "Ingredient-conscious millennials",
    age: "24-35",
    gender: "Female-skewing (65/35)",
    loc: "Mumbai, Delhi, Bangalore",
    income: "₹8-25 LPA",
    behaviour:
      "They read every ingredient list. They compare with international brands like Davids or RiseWell. They buy after seeing 3+ reviews from real users. Price-sensitive but will pay premium for proven efficacy.",
  },
  seg2: {
    name: "Gift-buying professionals",
    age: "28-45",
    gender: "Mixed",
    loc: "Tier 1 + Tier 2 cities",
    income: "₹12-40 LPA",
    behaviour:
      "They discover Perfora through Instagram or a dentist recommendation. They buy gift sets for Diwali, birthdays, or housewarming. They care about packaging aesthetics and unboxing experience.",
  },
  behInsights:
    "Hotjar data: 78% of mobile users scroll past the fold. Average PDP session: 45 seconds. Cart abandonment: 68%. Most common exit point: price comparison (users google 'Perfora vs Sensodyne'). Instagram referral converts 2.3× better than Google Shopping.",
  competitors:
    "Direct: Happydent, Dabur Red, Sensodyne India (mass), Spotlight Oral Care, Bite (DTC US). Indirect: The Ordinary (skincare science-forward UX), Sugar Cosmetics (Indian DTC playbook).",
  flows:
    "1. Browse → PDP → Add to Cart → Checkout → Payment\n2. Instagram link → PDP → Bundle suggestion → Cart\n3. Search (Google Shopping) → PDP → Compare → Exit OR Cart\n4. Dentist referral → Homepage → Category → PDP\n5. Returning customer → Homepage → Reorder from history",
  ia: "Homepage → Shop (by category: Toothpaste, Toothbrush, Mouthwash, Combos, Gifts) → PDP → Cart → Checkout. Also: About, Science, Blog, Reviews.",
  figmaLink: "",
  upcoming:
    "Subscription model launch (Q2), Dentist dashboard for recommendations, Referral program.",
  dsChoice: "describe",
  vibe: "Clean like Glossier, scientific like The Ordinary, but warmer and more Indian. White space with mint green and coral pops.",
  colors: "Primary: #2EC4B6 (mint/teal). Secondary: #FF6B6B (coral). Dark: #1A1A2E",
  fonts: "Headings: DM Sans Bold. Body: DM Sans Regular. Science: JetBrains Mono",
};

export const DEMO_FEATURE = {
  name: "Product Detail Page",
  type: "screen",
  problem:
    "Highest-traffic page but lowest conversion. Users browse ingredients but don't add to cart. Need to bridge the trust gap between reading and buying.",
  mustHave:
    "Product images, price, add to cart, ingredient list with explanations, science section, reviews, related products",
  notBe:
    "Not a comparison page. Not a long-scroll blog post. Not a generic e-commerce PDP template.",
  context: "",
};
