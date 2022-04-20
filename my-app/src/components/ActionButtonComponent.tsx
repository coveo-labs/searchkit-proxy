import React, { Component } from "react";
import { EuiButton } from "@elastic/eui";

import CoveoUA from "./CoveoAnalytics";
import { serialize } from "v8";

interface ButtonProps {
  caption: string;
  results: any;
  action: buttonActionEnum;
  main: boolean;
  enabled: boolean;
  callback: any;
}

export enum buttonActionEnum {
  searchEvent = "SearchEvent",
  impressionsEvent = "ImpressionsEvent",
  viewEvent = "ViewEvent",
  emitBasketEvent = "BasketEvent",
  purchaseEvent = "PurchaseEvent",
  clearBasket = "ClearBasketEvent",
}

export class AddButton extends Component<ButtonProps> {
  createProductData(result: any) {
    let product = {};
    product["sku"] = result["permanentid"] || "";
    product["name"] = result["title"] || "";
    product["category"] = result["type"] || "";
    //We will use the imdbrating as a price
    product["price"] = result["imdbrating"] || 0.0;
    product["url"] = result["uri"] || "";
    product["image"] = result["poster"] || "";
    product["plot"] = result["plot"] || "";
    product["id"] = product["sku"];
    return product;
  }
  addSearchEvent() {
    const product = []; //this.createProductData();
    CoveoUA.sentSearchEvent(product);
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    CoveoUA.emitUV("ecSearch", {
      type: "organic",
      outcome: "success",
      query: {
        id: CoveoUA.getQubitVisitor(),
        term: this.props.results.summary.query,
      },
      resultCount: this.props.results.summary.total,
      source: "proxy-search",
    });
  }

  addPurchase() {
    const revenue = 0;
    const tax = 0;
    let products = [];
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    const cartId = searchUid;
    const cartItems = CoveoUA.getCart();
    cartItems.forEach((product, index) => {
      //const product_parsed = this.createProductData(product.fields);
      products.push(product);
      CoveoUA.addProductForPurchase(product);
    });
    CoveoUA.setActionPurchase({
      id: cartId,
      revenue,
      shipping: 0,
      tax,
    });
    //Using Transaction
    //CoveoUA.emitBasket(searchUid, cartItems, "remove", product);

    CoveoUA.emitBasket(cartId, products, "", null, searchUid);
  }

  addImpressionsEvent() {
    let products = [];
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    if (searchUid !== "") {
      this.props.results.hits.items.forEach((product, index) => {
        const product_parsed = this.createProductData(product.fields);
        products.push(product_parsed["sku"]);
        CoveoUA.impressions(
          { ...product_parsed, position: index + 1 },
          searchUid
        );
      });
      coveoua("ec:setAction", "impression");
      coveoua("send", "event", CoveoUA.getOriginsAndCustomData());
    }
    this.addShown(products);
  }

  addShown(products: any) {
    CoveoUA.emitUV("ecSearchItemsShown", {
      type: "organic",
      outcome: "success",
      query: {
        id: CoveoUA.getQubitVisitor(),
        term: this.props.results.summary.query,
      },
      productIds: products,
    });
  }

  emitBasket() {
    let products = [];
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    if (searchUid !== "") {
      //get  the cart from the session
      const cartItems = CoveoUA.getCart();
      cartItems.forEach((product, index) => {
        products.push(product);
      });
      CoveoUA.emitBasket(searchUid, cartItems, "", null);
    }
  }

  clearBasket() {
    let products = [];
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    if (searchUid !== "") {
      //get  the cart from the session
      const cartItems = CoveoUA.getCart();
      cartItems.forEach((product, index) => {
        products.push(product);
        CoveoUA.emitBasket(searchUid, cartItems, "remove", product);
        //(cartId: string, products: any, action: string, newproduct: any, transactionId?: string)
      });
    }
  }

  addAction() {
    if (this.props.main) {
      if (this.props.callback) {
        this.props.callback();
      }
    }
    if (this.props.action === buttonActionEnum.emitBasketEvent) {
      this.emitBasket();
    }
    if (this.props.action === buttonActionEnum.clearBasket) {
      this.clearBasket();
    }
    if (this.props.action === buttonActionEnum.purchaseEvent) {
      this.addPurchase();
    }
    //check action type
    if (this.props.action === buttonActionEnum.searchEvent) {
      this.addSearchEvent();
    }
    if (this.props.action === buttonActionEnum.impressionsEvent) {
      this.addImpressionsEvent();
    }
  }

  render() {
    let caption = this.props.caption;
    if (this.props.action === buttonActionEnum.purchaseEvent) {
      //const cartItems = CoveoUA.getCart();
      //caption += " (" + cartItems.length + ")";
    }
    return (
      <EuiButton
        style={{ marginRight: "10px" }}
        onClick={() => this.addAction()}
      >
        {caption}
      </EuiButton>
    );
  }
}
export default AddButton;
