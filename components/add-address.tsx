"use client"

import axios from "axios";
import React, { useEffect, useState } from "react";

interface State {
  id: number;
  name: string;
  iso2: string;
}

interface City {
  id: number;
  name: string;
}

interface AddAddressProps {
  stateIsoCode: string;
  setStateIsoCode: (value: string) => void;
  stateName: string;
  setStateName: (value: string) => void;
  cityIsoCode: string;
  setCityIsoCode: (value: string) => void;
  cityName: string;
  setCityName: (value: string) => void;
}

const AddAddress: React.FC<AddAddressProps> = ({
  stateIsoCode,
  setStateIsoCode,
  stateName,
  setStateName,
  cityIsoCode,
  setCityIsoCode,
  cityName,
  setCityName,
}) => {
  const [stateData, setStateData] = useState<State[]>([]);
  const [citydata, setCitydata] = useState<City[]>([]);

  const API_KEY = "TUo5UThvYmNjckE0U294WmdzeFBtZmV4RzZlMUxhUHhTaG05TURVdQ==";

  useEffect(() => {
    getallStateData();
  }, []);

  const getallStateData = async () => {
    try {
      const config = {
        headers: {
          "X-CSCAPI-KEY": API_KEY,
        },
      };

      const response = await axios.get<State[]>(
        "https://api.countrystatecity.in/v1/countries/IN/states",
        config
      );

      setStateData(response.data);
    } catch (error) {
      console.log("Error:", error);
    }
  };

  const handlerChangeCity = async (event?: React.ChangeEvent<HTMLSelectElement>) => {
    if (!event) return;
    
    const stateiso2 = event.target.value;
    setStateIsoCode(stateiso2);
    console.log("iso2", stateiso2);

    if (!stateiso2) return;

    const countryIso2 = "IN";
    try {
      const config = {
        headers: {
          "X-CSCAPI-KEY": API_KEY,
        },
      };

      const response = await axios.get<City[]>(
        `https://api.countrystatecity.in/v1/countries/${countryIso2}/states/${stateiso2}/cities`,
        config
      );

      console.log(response.data);
      setCitydata(response.data);
    } catch (error) {
      console.error("Error:", error);

      if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        console.error(`Response error - Status: ${status}, Data:`, data);
      }
    }
  };

  const handlerchangecity = async (event?: React.ChangeEvent<HTMLSelectElement>) => {
    if (!event) return;
    
    const selectedIso2 = event.target.value;
    const selectedCity = citydata.find((city) => city.id.toString() === selectedIso2);

    setCityIsoCode(selectedIso2);
    setCityName(selectedCity ? selectedCity.name : "");
  };

  return (
    <div className="w-[100%] flex justify-between">
      <div className="w-[50%]">
        <label
          htmlFor="state"
          className="block mb-2 text-start text-sm font-medium text-gray-900 dark:text-white"
        >
          State *
        </label>
        <select
          id="state"
          name="state"
          value={stateIsoCode}
          onChange={async (event) => {
            handlerChangeCity(event);
            const selectedIso2 = event.target.value;
            const selectedState = stateData.find(
              (state) => state.iso2 === selectedIso2
            );
            setStateName(selectedState ? selectedState.name : "");
          }}
          className="bg-gray-50 border border-gray-300 w-[97%] text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        >
          <option value="" disabled>
            Select State
          </option>
          {stateData?.map((state) => (
            <option key={state.id} value={state.iso2}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      <div className="w-[48%]">
        <label
          htmlFor="city"
          className="block mb-2 text-start text-sm font-medium text-gray-900 dark:text-white"
        >
          City *
        </label>
        <select
          id="city"
          name="city"
          value={cityIsoCode}
          onChange={(event) => {
            handlerchangecity(event);
          }}
          disabled={!stateIsoCode}
          className="bg-gray-50 flex justify-end items-end border w-[100%] border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:opacity-50"
        >
          <option value="" disabled>
            {!stateIsoCode ? "Select state first" : "Select City"}
          </option>
          {citydata?.map((city) => (
            <option key={city.id} value={city.id.toString()}>
              {city.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AddAddress;
