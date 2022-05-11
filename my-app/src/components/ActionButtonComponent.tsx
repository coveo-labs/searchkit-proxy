import React, { Component } from "react";
import { EuiButton } from "@elastic/eui";

import CoveoUA from "./CoveoAnalytics";

interface ButtonProps {
  caption: string;
  results: any;
  action: buttonActionEnum;
  coveoEnabled: boolean;
  hide: boolean;
  searchQueryId: any;
  setCartCount: any;
};

export enum buttonActionEnum {
  // impressionsEvent = "ImpressionsEvent",
  purchaseEvent = "PurchaseEvent",
  clearCart = "ClearCart",
};

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

  addPurchase() {
    const transactionId = Date.now() + CoveoUA.getQubitVisitor().replace(/\D/g,'')
    const revenue = 0;
    const tax = 0;
    let products = [];
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    const cartId = searchUid;
    const cartItems = CoveoUA.getCart();
    cartItems.forEach(product => {
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
    CoveoUA.emitBasket(cartId, products, "", null, transactionId);
    this.clearCart({ bypassEventEmitting: true });
  }

  addImpressionsEvent() {
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    if (searchUid !== "") {
      this.props.results.hits.items.forEach((product, index) => {
        const product_parsed = this.createProductData(product.fields);
        CoveoUA.impressions(
          { ...product_parsed, position: index + 1 },
          searchUid
        );
      });
      coveoua("ec:setAction", "impression");
      coveoua("send", "event", CoveoUA.getOriginsAndCustomData());
    }
  }

  clearCart({ bypassEventEmitting = false }: { bypassEventEmitting?: boolean } = {}) {
    const cartItems = CoveoUA.getCart();
    if (cartItems.length) {
      const searchUid = (
        this.props.results.hits.items[0].fields["searchQueryUid"] || ""
      );
      while (cartItems.length) {
        const itemIndex = cartItems.length - 1;
        const product = cartItems[itemIndex];
        if (!bypassEventEmitting) {
          CoveoUA.emitBasket(searchUid, cartItems, "remove", product);
        }
        cartItems.splice(itemIndex, 1);
      }
      CoveoUA.setCart(cartItems);
      this.props.setCartCount(0);
    }
  }

  addAction() {
    if (this.props.action === buttonActionEnum.clearCart) {
      this.clearCart();
    }
    if (this.props.action === buttonActionEnum.purchaseEvent) {
      this.addPurchase();
    }
    // if (this.props.action === buttonActionEnum.impressionsEvent) {
    //   this.addImpressionsEvent();
    // }
  }

  render() {
    return (
      <EuiButton
        style={{ marginRight: "10px", display: this.props.hide ? 'none' : 'initial' }}
        onClick={() => this.addAction()}
      >
        {this.props.caption}
      </EuiButton>
    );
  }
};
export default AddButton;
