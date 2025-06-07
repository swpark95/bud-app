// ─── src/components/Router.tsx ───
import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "../pages/home";
import WarehouseList from "../pages/warehouses/warehouses";
import Warehouse from "../pages/warehouses/warehouse";

import Inbound from "../pages/warehouses/inbound/inbound";
import InboundScan from "../pages/warehouses/inbound/inbound-scan";
import InboundInfo from "../pages/warehouses/inbound/inbound-info";
import InboundResult from "../pages/warehouses/inbound/inbound-result";

import Outbound from "../pages/warehouses/outbound/outbound";

import Inventory from "../pages/inventory/inventory";
import InventoryDetail from "../pages/inventory/detail";

import Login from "../pages/login";
import Signup from "../pages/signup";

export default function Router() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/warehouses" element={<WarehouseList />} />
        <Route path="/warehouses/:whId" element={<Warehouse />} />
        <Route path="/warehouses/:whId/inbound" element={<Inbound />} />
        <Route path="/warehouses/:whId/inbound/:sId" element={<InboundScan />} />
        <Route path="/warehouses/:whId/inbound/:sId/info" element={<InboundInfo />}/>
        <Route path="/warehouses/:whId/inbound/:sId/info/result" element={<InboundResult />} />
        {/*
          HashRouter를 쓰면, “#/warehouses/:whId/inbound/:sId/info” 같은
          경로도 정상 매칭이 됩니다.
        */}

        <Route path="/warehouses/:whId/outbound" element={<Outbound />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/:sku" element={<InventoryDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </div>
  );
}
