import { getEndpoint } from "./Endpoints";
import { getApiKey } from "./settings";

/* globals coveoua */
declare global {
  /* eslint-disable no-unused-vars */
  function coveoua<T>(action?: string, fieldName?: any, fieldValue?: any);
}

interface AnalyticsProductData {
  name: string;
  id: string;
  brand: string;
  group: string;
  quantity?: number;
  price: number;
  category: string;
  variant: string;
}


export const getAnalyticsProductData = (product, sku = '', quantity = 0, withQuantity = true) => {

  let category = '';
  if (product?.ec_category?.length) {
    category = product.ec_category;
    category = category[category.length - 1];
  }

  // DOC: https://docs.coveo.com/en/l29e0540/coveo-for-commerce/tracking-commerce-events-reference#product-fields-reference
  const analyticsProductData: AnalyticsProductData = {
    name: product.ec_name,
    id: product.permanentid,
    brand: product.ec_brand,
    group: product.ec_item_group_id,
    price: product.ec_promo_price,
    category: category,
    variant: sku,
  };


  if (withQuantity) {
    analyticsProductData['quantity'] = quantity;
  }

  return analyticsProductData;
};

const getOriginsAndCustomData = (dataToMerge?: any) => {
  const page = window.location.pathname;
  let originLevel2 = 'default';
  if (page.startsWith('/plp/') || page.startsWith('/pdp/')) {
    originLevel2 = page.substring(5);
  }

  const custom = {
    ...(dataToMerge || {}),
  };

  return {
    custom,
    searchHub: sessionStorage.getItem('pageType'),
    tab: originLevel2,
  };
};

const initCoveo = () => {
  if (window['coveoinit'] === undefined) {
    coveoua('init', `${getApiKey()}`, `${getEndpoint("analytics")}`);
    window['coveoinit'] = true;
  }
}
const addProductForPurchase = (products: AnalyticsProductData[] | AnalyticsProductData) => {
  initCoveo();
  products = Array.isArray(products) ? products : [products];
  products.forEach(product => {
    coveoua('ec:addProduct', product);
  });
};

const addToCart = (products: AnalyticsProductData[] | AnalyticsProductData, action: ('add' | 'remove') = 'add') => {
  initCoveo();
  addProductForPurchase(products);
  coveoua('ec:setAction', action);
  coveoua('send', 'event', getOriginsAndCustomData());
};

const removeFromCart = (products: AnalyticsProductData[] | AnalyticsProductData) => {
  initCoveo();
  addToCart(products, 'remove');
};

const getReferrer = () => {
  // in a Single Page App (SPA), we can't rely on document.referrer when navigating on the site. 
  let referrer = sessionStorage.getItem('path.current');
  // there may be a delay for the route in sessionStorage (path.current) to be updated, so we compare it with href, 
  if (referrer && referrer === window.location.href && sessionStorage.getItem('path.previous')) {
    // path.current was the same as href, use path.previous
    referrer = sessionStorage.getItem('path.previous');
  }
  else if (!referrer) {
    // no referrer, fall back to the usual document.referrer
    referrer = document.referrer;
  }
  return referrer;
};

const detailView = (product) => {
  // Send the "pageview" event (measurement) 
  // https://docs.coveo.com/en/l2pd0522/coveo-for-commerce/measure-events-on-a-product-detail-page
  initCoveo();
  coveoua('ec:addProduct', product);
  coveoua('ec:setAction', 'detail');
  coveoua('send', 'event', getOriginsAndCustomData());
};

const impressions = (product, searchUid) => {
  initCoveo();
  coveoua('ec:addImpression', {
    ...product,
    list: `coveo:search:${searchUid}`
  });
};

const logPageView = () => {
  initCoveo();
  coveoua('set', 'page', window.location.pathname);
  coveoua('send', 'pageview', getOriginsAndCustomData());
};


const sentSearchEvent = (contents: any) => {
  initCoveo();
  coveoua('set', 'page', window.location.pathname);
  coveoua('send', 'pageview', getOriginsAndCustomData());
};



const productClick = (product, searchUid: string, recommendationStrategy: string = '', callBack) => {
  initCoveo();
  const productData = {
    ...getAnalyticsProductData(product),
    position: product.index + 1
  };
  coveoua('ec:addProduct', productData);
  coveoua('ec:setAction', 'click', {
    list: `coveo:search:${searchUid}`
  });

  let customData: any = {};
  if (recommendationStrategy) {
    customData.recommendation = recommendationStrategy;
  }

  coveoua('send', 'event', getOriginsAndCustomData(customData));

  setTimeout(callBack, 5);
};

const setActionPurchase = (purchasePayload) => {
  initCoveo();
  coveoua('ec:setAction', 'purchase', purchasePayload);
  coveoua('send', 'event', getOriginsAndCustomData());
};


//
// Get the visitor id from various sources (localStorage, cookies) 
//
// We are generating a new visitorId until KIT-1208 is fixed to avoid
// having analytics with differents visitor ids in the same session
//
export const getVisitorId = () => {
  if (typeof window !== "object") {
    // analytics on server-side are disabled
    return '';
  }

  let visitorId = window['coveo_visitorId'];
  if (!visitorId) {
    visitorId = window['coveoanalytics']?.getCurrentClient()?.visitorId;
  }

  if (visitorId) {
    // save it for later
    window['coveo_visitorId'] = visitorId;
  }

  return visitorId;
};

export const emitUV = (type, payload) => {
  window['uv'].emit(type, payload);
};

export const emitUser = () => {
  window['uv'].emit('ecUser', { user: { id: getVisitorId(), email: getVisitorId() + '@example.com', }, });
};

const roundPrice = (price) => {
  return Math.ceil(price * 100) / 100;
};

export const emitBasket = (transactionId?: string) => {

  // //We need to fix this cartStore stuff
  // const cartState = cartStore.getState();
  // const currency = 'USD';
  // const TAX_RATE = 1.05;

  // const cartId = cartState.cartId;
  // const cartQuantity = (cartState.items || []).reduce((prev, cur) => (prev + cur.quantity), 0);
  // const cartSubTotal = roundPrice((cartState.items || []).reduce((prev, cur) => (prev + (cur.detail.ec_promo_price * cur.quantity)), 0));
  // const cartTotal = roundPrice(cartSubTotal * TAX_RATE);

  // (cartState.items || []).forEach(item => {
  //   const detail = item.detail;

  //   const subtotal = roundPrice(detail.ec_promo_price * item.quantity);
  //   const subtotalIncludingTax = roundPrice(subtotal * TAX_RATE);

  //   const basketItem = {
  //     basket: {
  //       id: cartId,
  //       quantity: cartQuantity,
  //       total: { value: cartTotal, currency }
  //     },
  //     product: {
  //       productId: detail.permanentid,
  //       name: detail.ec_name,
  //       url: detail.uri,
  //       sku: item.sku,
  //       originalPrice: { value: detail.ec_price, currency, baseValue: detail.ec_price, baseCurrency: currency },
  //       price: { value: detail.ec_promo_price, currency, baseValue: detail.ec_promo_price, baseCurrency: currency },
  //       stock: item.quantity,
  //       images: [detail.ec_images[0]],
  //       category: detail.cat_categories,
  //       categories: [detail.cat_categories.join(' > ')],
  //     },
  //     quantity: item.quantity,
  //     subtotalIncludingTax: { value: subtotalIncludingTax, currency },
  //     subtotal: {
  //       value: subtotal, currency
  //     }
  //   };
  //   if (transactionId) {
  //     basketItem['transaction'] = { id: transactionId };
  //   }
  //   emitUV(transactionId ? 'ecBasketItemTransaction' : 'ecBasketItem', basketItem);
  // });

  // const basketSummary = {
  //   basket: {
  //     subtotal: { value: cartSubTotal, currency }, // the basket value *before* the application of taxes, discounts, promotions, shipping costs
  //     subtotalIncludingTax: { value: cartTotal, currency },  //the basket subtotal, including tax, but before the application of discounts, promotions, shipping costs, 
  //     total: { value: cartTotal, currency },
  //     quantity: cartQuantity
  //   }
  // };
  // if (transactionId) {
  //   basketSummary['transaction'] = { id: transactionId };
  // }

  // if (cartState.items?.length) {
  //   emitUV(transactionId ? 'ecBasketTransactionSummary' : 'ecBasketSummary', basketSummary);
  // }
};

const CoveoAnalytics = {
  addProductForPurchase,
  addToCart,
  detailView,
  getAnalyticsProductData,
  getOriginsAndCustomData,
  impressions,
  logPageView,
  productClick,
  removeFromCart,
  setActionPurchase,
  sentSearchEvent,
  emitUV,
  emitBasket,
  emitUser,
};

export default CoveoAnalytics;