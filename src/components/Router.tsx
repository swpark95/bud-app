import '../App.css';
import {Routes, Route}from 'react-router-dom';
import Home from '../pages/home';
import WarehouseList from '../pages/warehouses/warehouses';
import Warehouse from '../pages/warehouses/warehouse';

import Inbound from '../pages/warehouses/inbound/inbound';
import InboundScan from '../pages/warehouses/inbound/inbound-scan';
import InboundInfo from '../pages/warehouses/inbound/inbound-info';

import Outbound from '../pages/warehouses/outbound/outbound';
// import OutboundScan from '../pages/warehouses/outbound-scan';


import Inventory from '../pages/inventory/inventory';
import InventoryDetail from '../pages/inventory/detail';

import Login from '../pages/login';
import Signup from '../pages/signup';



export default function Router() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/warehouses" element={<WarehouseList />} />
        <Route path="/warehouses/:whId" element={<Warehouse />} />
        <Route path="/warehouses/:whId/inbound" element={<Inbound />} />
        <Route path="/warehouses/:whId/inbound/:sId" element={<InboundScan />} />
        <Route path="/warehouses/:whId/inbound/:sId/info" element={<InboundInfo />} />
        <Route path="/warehouses/:whId/outbound" element={<Outbound />} />
        {/* <Route path="/warehouses/:whId/outbound/:sId" element={<OutboundScan />} /> */}
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/:sku" element={<InventoryDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </div>
  );
}

