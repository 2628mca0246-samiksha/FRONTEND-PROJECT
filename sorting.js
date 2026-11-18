/**
 * Interactive waste-sorting rules.
 * FUTURE BACKEND: fetch('/api/sorting?material=&itemType=&condition=')
 */

const SORT_TREE = {
  plastic: {
    label: "Plastic",
    types: {
      bottle: { label: "Bottle" },
      "food-container": { label: "Food container" },
      bag: { label: "Bag / film" },
    },
  },
  paper: {
    label: "Paper",
    types: {
      cardboard: { label: "Cardboard" },
      newspaper: { label: "Newspaper" },
      "soiled-paper": { label: "Soiled paper" },
    },
  },
  glass: {
    label: "Glass",
    types: {
      jar: { label: "Jar" },
      bottle: { label: "Bottle" },
      broken: { label: "Broken glass" },
    },
  },
  metal: {
    label: "Metal",
    types: {
      can: { label: "Can" },
      scrap: { label: "Scrap / tools" },
    },
  },
  electronics: {
    label: "Electronics",
    types: {
      phone: { label: "Broken phone" },
      cable: { label: "Charger / cable" },
      battery: { label: "Battery" },
    },
  },
  organic: {
    label: "Organic",
    types: {
      leftovers: { label: "Food leftovers" },
      scraps: { label: "Vegetable scraps" },
    },
  },
  textile: {
    label: "Textile",
    types: {
      wearable: { label: "Wearable clothes" },
      torn: { label: "Torn / stained textiles" },
    },
  },
  household: {
    label: "Household",
    types: {
      furniture: { label: "Furniture" },
      toy: { label: "Toy" },
    },
  },
};

const sortAdvice = (material, itemType, condition) => {
  const key = `${material}|${itemType}|${condition}`;
  const table = {
    "plastic|bottle|clean": {
      tone: "good",
      title: "Usually recyclable",
      text: "♻️ Usually recyclable. Check your local recycling rules. Caps may need to stay on or come off depending on the city.",
    },
    "plastic|bottle|dirty": {
      tone: "warn",
      title: "Rinse first",
      text: "Clean it first if your local recycling system accepts this material. Food residue can contaminate a whole batch.",
    },
    "plastic|food-container|clean": {
      tone: "good",
      title: "Often recyclable if numbered",
      text: "If the resin is accepted locally, a clean container can go in recycling. Otherwise reuse it as storage.",
    },
    "plastic|food-container|dirty": {
      tone: "warn",
      title: "Clean it first",
      text: "Clean it first if your local recycling system accepts this material. Oily trays are a common rejection.",
    },
    "plastic|bag|clean": {
      tone: "warn",
      title: "Not in household recycling",
      text: "Soft plastic film usually needs a store drop-off, not the kerbside bin. Reuse as bin liners if clean.",
    },
    "electronics|phone|broken": {
      tone: "alert",
      title: "E-waste only",
      text: "📱 Do not put it in regular household waste. Use an appropriate e-waste collection point. Wipe your data first.",
    },
    "electronics|cable|broken": {
      tone: "alert",
      title: "E-waste",
      text: "Cables and chargers belong in e-waste streams, not mixed recycling.",
    },
    "electronics|battery|any": {
      tone: "alert",
      title: "Never in household bins",
      text: "Batteries can fire in collection trucks. Take them to a battery or e-waste point.",
    },
    "organic|leftovers|edible": {
      tone: "good",
      title: "Eat or share first",
      text: "Safe leftovers should be eaten or shared. Compost only what cannot be eaten.",
    },
    "organic|scraps|any": {
      tone: "good",
      title: "Compost if you can",
      text: "Vegetable scraps belong in compost or a city organics programme, not landfill.",
    },
    "textile|wearable|clean": {
      tone: "good",
      title: "Donate or keep wearing",
      text: "Wearable clothes should be reused or donated, not recycled first.",
    },
    "textile|torn|dirty": {
      tone: "warn",
      title: "Textile recycling / rags",
      text: "Unwearable textiles can become rags or go to a textile recycler. Wash if a charity will handle them.",
    },
    "paper|cardboard|clean": {
      tone: "good",
      title: "Flatten and recycle",
      text: "Clean, dry cardboard is widely recyclable. Remove excess tape when you can.",
    },
    "paper|soiled-paper|dirty": {
      tone: "warn",
      title: "Not recyclable",
      text: "Greasy or food-soiled paper usually cannot be recycled. Compost if the system allows, otherwise residual waste.",
    },
    "glass|broken|any": {
      tone: "alert",
      title: "Handle as sharps",
      text: "Broken glass should not go in mixed recycling bags. Wrap safely and follow local glass rules.",
    },
    "glass|jar|clean": {
      tone: "good",
      title: "Reuse, then recycle",
      text: "Intact jars are excellent storage. Recycle clean glass if you do not need it.",
    },
    "metal|can|clean": {
      tone: "good",
      title: "High-value recycling",
      text: "Rinse and recycle. Metal is one of the most efficiently recycled materials.",
    },
  };

  if (table[key]) return table[key];
  if (table[`${material}|${itemType}|any`]) return table[`${material}|${itemType}|any`];

  if (condition === "dirty") {
    return {
      tone: "warn",
      title: "Clean before sorting",
      text: "Clean it first if your local system accepts this material. Contamination is the main reason recycling is rejected.",
    };
  }
  if (material === "electronics") {
    return {
      tone: "alert",
      title: "Keep out of household waste",
      text: "📱 Do not put electronics in regular household waste. Use an e-waste collection point.",
    };
  }
  return {
    tone: "good",
    title: "Check local rules",
    text: "This combination is often recoverable, but collection lists differ by city. When unsure, reuse or take it to a dedicated drop-off.",
  };
};

const initSorting = () => {
  const page = document.getElementById("sorting-page");
  if (!page) return;
  const materialSel = document.getElementById("sort-material");
  const typeSel = document.getElementById("sort-type");
  const conditionSel = document.getElementById("sort-condition");
  const result = document.getElementById("sort-result");

  Object.entries(SORT_TREE).forEach(([id, meta]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = meta.label;
    materialSel.appendChild(opt);
  });

  const fillTypes = () => {
    const material = SORT_TREE[materialSel.value];
    typeSel.innerHTML = "";
    Object.entries(material.types).forEach(([id, meta]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = meta.label;
      typeSel.appendChild(opt);
    });
  };

  const render = () => {
    const advice = sortAdvice(materialSel.value, typeSel.value, conditionSel.value);
    result.className = `sort-result is-${advice.tone}`;
    result.innerHTML = `<h3>${advice.title}</h3><p>${advice.text}</p><p class="mb-0 small">Demo guidance — connect municipal rules via the backend later.</p>`;
  };

  materialSel.addEventListener("change", () => {
    fillTypes();
    render();
  });
  typeSel.addEventListener("change", render);
  conditionSel.addEventListener("change", render);

  fillTypes();
  render();
};

document.addEventListener("DOMContentLoaded", initSorting);
