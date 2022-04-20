import React, { useEffect } from "react";
import { getQubitTrackerId, getQubitExperienceId, getHostElastic } from "./components/settings";
import CoveoUA from "./components/CoveoAnalytics";

import {
  DateRangeFacet,
  MultiMatchQuery,
  RangeFacet,
  RefinementSelectFacet,
} from "@searchkit/sdk";
import { AddResultButton, buttonResultActionEnum } from "./components/ActionButtonResultComponent";
import { AddButton, buttonActionEnum } from "./components/ActionButtonComponent";
import { EnableProxy } from "./components/EnableProxy";
import {
  FacetsList,
  SearchBar,
  ResetSearchButton,
  SelectedFilters,
  Pagination,
} from "@searchkit/elastic-ui";
import { useSearchkitVariables } from "@searchkit/client";
import { useSearchkitSDK } from "@searchkit/sdk/lib/esm/react-hooks";
import {
  EuiPage,
  EuiFlexGrid,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiTitle,
  EuiHorizontalRule,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from "@elastic/eui";

import { gql, useQuery } from "@apollo/client";

import "@elastic/eui/dist/eui_theme_light.css";
import "./App.css";

let sseCallbackUrl = '';

let config = {
  host: getHostElastic(),
  connectionOptions: {
    apiKey: "NWF4c2VYOEJzRDhHMzlEX1JDejU6YnJXaS1XWjlSZ2F5ek1Cc3V4aXV6dw==",
  },
  index: "imdb_movies",
  sortOptions: [
    { id: "relevance", label: "Relevance", field: "_score" },
    { id: "released", label: "Recent Releases", field: { released: "desc" } },
  ],
  hits: {
    fields: ["title"],
  },
  query: new MultiMatchQuery({
    fields: [
      "title",
      "genres",
      "directors",
      "writers",
      "actors",
      "countries",
      "plot",
    ],
  }),
  facets: [
    new RefinementSelectFacet({
      field: "type",
      identifier: "type",
      label: "Type",
      multipleSelect: true,
    }),
    new RangeFacet({
      field: "metascore",
      identifier: "metascore",
      label: "Metascore",
      range: {
        min: 0,
        max: 100,
        interval: 5,
      },
    }),
    new DateRangeFacet({
      field: "released",
      identifier: "released",
      label: "Released",
    }),

    new RefinementSelectFacet({
      field: "genres.keyword",
      identifier: "genres",
      label: "Genres",
      multipleSelect: true,
    }),

    new RefinementSelectFacet({
      field: "countries.keyword",
      identifier: "countries",
      label: "Countries",
    }),
    new RefinementSelectFacet({
      field: "rated",
      identifier: "rated",
      label: "Rated",
      multipleSelect: true,
    }),
    new RefinementSelectFacet({
      field: "directors.keyword",
      identifier: "directors",
      label: "Directors",
    }),

    new RefinementSelectFacet({
      field: "writers.keyword",
      identifier: "writers",
      label: "Writers",
    }),

    new RefinementSelectFacet({
      field: "actors.keyword",
      identifier: "actors",
      label: "Actors",
      multipleSelect: true,
    }),

    new RangeFacet({
      field: "imdbrating",
      identifier: "imdbrating",
      label: "IMDB Rating",
      range: {
        interval: 1,
        max: 10,
        min: 1,
      },
    }),
  ],
};


function changeResult(ref, result) {
  ref.result = result;
}


const HitsList = ({ data }) => (
  <EuiFlexGrid>
    {data?.hits.items.map((hit, index) => (
      <EuiFlexItem key={hit.id}>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <img
                  src={hit.fields.poster}
                  alt="Nature"
                  style={{ height: "150px" }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={4}>
                <EuiTitle size="xs">
                  <h6>{hit.fields.title}</h6>
                </EuiTitle>
                <EuiText grow={false}>
                  <p>{hit.fields.plot}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <EuiText grow={false}>
                  <ul>
                    <li>
                      <b>ACTORS: </b>
                      {hit.fields.actors?.join(", ")}
                    </li>

                    <li>
                      <b>WRITERS: </b>
                      {hit.fields.writers?.join(", ")}
                    </li>
                  </ul>
                </EuiText>
              </EuiFlexItem>

            </EuiFlexGroup>
            <EuiFlexGroup style={{ paddingLeft: '150px', paddingBottom: '30px', paddingRight: '10px' }}>
              <AddResultButton
                caption="Add Search Click"
                action={buttonResultActionEnum.addClick}
                result={hit}
                main={false}
                position={index}
                summary={data.summary}
                updateCart={false}
              ></AddResultButton>
              <AddResultButton
                caption="Add To Cart"
                action={buttonResultActionEnum.addToCart}
                result={hit}
                main={false}
                position={index}
                summary={data.summary}
                updateCart={true}
              ></AddResultButton>
              <AddResultButton
                caption="Remove From Cart"
                action={buttonResultActionEnum.removeFromCart}
                result={hit}
                main={false}
                position={index}
                summary={data.summary}
                updateCart={true}
              ></AddResultButton>
              <AddResultButton
                caption="Add Details (Product)"
                action={buttonResultActionEnum.addDetails}
                result={hit}
                main={false}
                position={index}
                summary={data.summary}
                updateCart={false}
              ></AddResultButton>
            </EuiFlexGroup>
          </EuiFlexItem>

        </EuiFlexGroup>

      </EuiFlexItem >
    ))}
  </EuiFlexGrid >
);

function App() {
  const Facets = FacetsList([]);
  let variables = useSearchkitVariables();

  //@ts-ignore
  const { results, loading } = useSearchkitSDK(config, variables);

  // Emit View on page load
  useEffect(() => {
    CoveoUA.logPageView();
    const language = "en-us",
      country = "US",
      currency = "USD";
    CoveoUA.emitUV("ecView", { type: "home", language, country, currency });
    CoveoUA.emitUser();
  }, [])


  function changeHost(host) {
    config["host"] = host;
  }

  function ecSent() {
    getResponse(sseCallbackUrl, "POST");
  }

  function setSSECallbackUrl(url) {
    sseCallbackUrl = url;
  }


  async function getResponse(url, method) {
    const request = new Request(url);

    const response = await fetch(request, { method: method });
    return response;
  }




  return (
    <EuiPage>
      <EuiPageSideBar>
        <SearchBar loading={loading} />
        <EuiHorizontalRule margin="m" />
        <Facets data={results} loading={loading} />
      </EuiPageSideBar>
      <EuiPageBody component="div">
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <SelectedFilters data={results} loading={loading} />
            </EuiTitle>
          </EuiPageHeaderSection>
          <EuiPageHeaderSection>
            <AddButton
              caption="Add Search Event"
              action={buttonActionEnum.searchEvent}
              main={false}
              results={results}
            ></AddButton>
            <AddButton
              caption="Add Impressions/Shown Event"
              action={buttonActionEnum.impressionsEvent}
              main={false}
              results={results}
            ></AddButton>
            <AddButton
              caption="Sent Basket"
              action={buttonActionEnum.emitBasketEvent}
              main={false}
              results={results}
            ></AddButton>
            <AddButton
              caption="Purchase"
              action={buttonActionEnum.purchaseEvent}
              main={false}
              results={results}
            ></AddButton>

            <EnableProxy enableCaption="Using Coveo" disableCaption="Using Elastic" setCallbackUrl={(e) => setSSECallbackUrl(e)} setHost={(e) => changeHost(e)} ></EnableProxy>
            <ResetSearchButton loading={loading} />
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="s">
                <h2>{results?.summary.total} Results</h2>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <HitsList data={results} />
            <EuiFlexGroup justifyContent="spaceAround">
              <Pagination data={results} />
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

export default App;
