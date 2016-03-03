
hyper.log ('bluetooth intrumentation provider loading....')

evothings.easyble.reset()
evothings.easyble.reportDeviceOnce(true)

/*
There was a merge conflict, commented out this code.

var me = window.evo.bluetooth =
{
    bluetoothServices: {
        "alert_notification": '1811',
        "automation_io": '1815',
        "battery_service": '180F',
        "blood_pressure": '1810',
        "body_composition": '181B',
        "bond_management": '181E',
        "continuous_glucose_monitoring": '181F',
        "current_time": '1805',
        "cycling_power": '1818',
        "cycling_speed_and_cadence": '1816',
        "device_information": '180A',
        "environmental_sensing": '181A',
        "generic_access": '1800',
        "generic_attribute": '1801',
        "glucose": '1808',
        "health_thermometer": '1809',
        "heart_rate": '180D',
        "human_interface_device": '1812',
        "immediate_alert": '1802',
        "indoor_positioning": '1821',
        "internet_protocol_support": '1820',
        "link_loss": '1803',
        "location_and_navigation": '1819',
        "next_dst_change": '1807',
        "phone_alert_status": '180E',
        "pulse_oximeter": '1822',
        "reference_time_update": '1806',
        "running_speed_and_cadence": '1814',
        "scan_parameters": '1813',
        "tx_power": '1804',
        "user_data": '181C',
        "weight_scale": '181D'
    },

    bluetoothCharacteristics : {
    "aerobic_heart_rate_lower_limit": '2A7E',
    "aerobic_heart_rate_upper_limit": '2A84',
    "aerobic_threshold": '2A7F',
    "age": '2A80',
    "aggregate": '2A5A',
    "alert_category_id": '2A43',
    "alert_category_id_bit_mask": '2A42',
    "alert_level": '2A06',
    "alert_notification_control_point": '2A44',
    "alert_status": '2A3F',
    "altitude": '2AB3',
    "anaerobic_heart_rate_lower_limit": '2A81',
    "anaerobic_heart_rate_upper_limit": '2A82',
    "anaerobic_threshold": '2A83',
    "analog": '2A58',
    "apparent_wind_direction": '2A73',
    "apparent_wind_speed": '2A72',
    "gap.appearance": '2A01',
    "barometric_pressure_trend": '2AA3',
    "battery_level": '2A19',
    "blood_pressure_feature": '2A49',
    "blood_pressure_measurement": '2A35',
    "body_composition_feature": '2A9B',
    "body_composition_measurement": '2A9C',
    "body_sensor_location": '2A38',
    "bond_management_control_point": '2AA4',
    "bond_management_feature": '2AA5',
    "boot_keyboard_input_report": '2A22',
    "boot_keyboard_output_report": '2A32',
    "boot_mouse_input_report": '2A33',
    "gap.central_address_resolution_support": '2AA6',
    "cgm_feature": '2AA8',
    "cgm_measurement": '2AA7',
    "cgm_session_run_time": '2AAB',
    "cgm_session_start_time": '2AAA',
    "cgm_specific_ops_control_point": '2AAC',
    "cgm_status": '2AA9',
    "csc_feature": '2A5C',
    "csc_measurement": '2A5B',
    "current_time": '2A2B',
    "cycling_power_control_point": '2A66',
    "cycling_power_feature": '2A65',
    "cycling_power_measurement": '2A63',
    "cycling_power_vector": '2A64',
    "database_change_increment": '2A99',
    "date_of_birth": '2A85',
    "date_of_threshold_assessment": '2A86',
    "date_time": '2A08',
    "day_date_time": '2A0A',
    "day_of_week": '2A09',
    "descriptor_value_changed": '2A7D',
    "gap.device_name": '2A00',
    "dew_point": '2A7B',
    "digital": '2A56',
    "dst_offset": '2A0D',
    "elevation": '2A6C',
    "email_address": '2A87',
    "exact_time_256": '2A0C',
    "fat_burn_heart_rate_lower_limit": '2A88',
    "fat_burn_heart_rate_upper_limit": '2A89',
    "firmware_revision_string": '2A26',
    "first_name": '2A8A',
    "five_zone_heart_rate_limits": '2A8B',
    "floor_number": '2AB2',
    "gender": '2A8C',
    "glucose_feature": '2A51',
    "glucose_measurement": '2A18',
    "glucose_measurement_context": '2A34',
    "gust_factor": '2A74',
    "hardware_revision_string": '2A27',
    "heart_rate_control_point": '2A39',
    "heart_rate_max": '2A8D',
    "heart_rate_measurement": '2A37',
    "heat_index": '2A7A',
    "height": '2A8E',
    "hid_control_point": '2A4C',
    "hid_information": '2A4A',
    "hip_circumference": '2A8F',
    "humidity": '2A6F',
    "ieee_11073-20601_regulatory_certification_data_list": '2A2A',
    "indoor_positioning_configuration": '2AAD',
    "intermediate_blood_pressure": '2A36',
    "intermediate_temperature": '2A1E',
    "irradiance": '2A77',
    "language": '2AA2',
    "last_name": '2A90',
    "latitude": '2AAE',
    "ln_control_point": '2A6B',
    "ln_feature": '2A6A',
    "local_east_coordinate.xml": '2AB1',
    "local_north_coordinate": '2AB0',
    "local_time_information": '2A0F',
    "location_and_speed": '2A67',
    "location_name": '2AB5',
    "longitude": '2AAF',
    "magnetic_declination": '2A2C',
    "magnetic_flux_density_2D": '2AA0',
    "magnetic_flux_density_3D": '2AA1',
    "manufacturer_name_string": '2A29',
    "maximum_recommended_heart_rate": '2A91',
    "measurement_interval": '2A21',
    "model_number_string": '2A24',
    "navigation": '2A68',
    "new_alert": '2A46',
    "gap.peripheral_preferred_connection_parameters": '2A04',
    "gap.peripheral_privacy_flag": '2A02',
    "plx_continuous_measurement": '2A5F',
    "plx_features": '2A60',
    "plx_spot_check_measurement": '2A5E',
    "pnp_id": '2A50',
    "pollen_concentration": '2A75',
    "position_quality": '2A69',
    "pressure": '2A6D',
    "protocol_mode": '2A4E',
    "rainfall": '2A78',
    "gap.reconnection_address": '2A03',
    "record_access_control_point": '2A52',
    "reference_time_information": '2A14',
    "report": '2A4D',
    "report_map": '2A4B',
    "resting_heart_rate": '2A92',
    "ringer_control_point": '2A40',
    "ringer_setting": '2A41',
    "rsc_feature": '2A54',
    "rsc_measurement": '2A53',
    "sc_control_point": '2A55',
    "scan_interval_window": '2A4F',
    "scan_refresh": '2A31',
    "sensor_location": '2A5D',
    "serial_number_string": '2A25',
    "gatt.service_changed": '2A05',
    "software_revision_string": '2A28',
    "sport_type_for_aerobic_and_anaerobic_thresholds": '2A93',
    "supported_new_alert_category": '2A47',
    "supported_unread_alert_category": '2A48',
    "system_id": '2A23',
    "temperature": '2A6E',
    "temperature_measurement": '2A1C',
    "temperature_type": '2A1D',
    "three_zone_heart_rate_limits": '2A94',
    "time_accuracy": '2A12',
    "time_source": '2A13',
    "time_update_control_point": '2A16',
    "time_update_state": '2A17',
    "time_with_dst": '2A11',
    "time_zone": '2A0E',
    "true_wind_direction": '2A71',
    "true_wind_speed": '2A70',
    "two_zone_heart_rate_limit": '2A95',
    "tx_power_level": '2A07',
    "uncertainty": '2AB4',
    "unread_alert_status": '2A45',
    "user_control_point": '2A9F',
    "user_index": '2A9A',
    "uv_index": '2A76',
    "vo2_max": '2A96',
    "waist_circumference": '2A97',
    "weight": '2A98',
    "weight_measurement": '2A9D',
    "weight_scale_feature": '2A9E',
    "wind_chill": '2A79'
},

    services: [],
    subscriptions: [],
    devices: [],
    connections: [],
    serviceHandles:[],
    characteristics: [],
    name: 'bluetooth',
    icon: 'images/bt.png',
    sidcount : 1,

    // "b9404000-f5f8-466e-aff9-25556b57fe6d"
    getNameForServiceUUID: function(_UUID)
    {
        var UUID = _UUID.toUpperCase()
        var rv = undefined
        var me = window.evo.bluetooth
        if(UUID.length == 36)
        {
            for(var name in me.bluetoothServices)
            {
                var code = me.bluetoothServices[name]
                var part = UUID.substring(4,8)
                if (part == code)
                {
                    rv = name
                    break
                }
            }
        }
        return rv
    },

    getNameForCharactersticUUID: function(_UUID)
    {
        var UUID = _UUID.toUpperCase()
        var rv = undefined
        var me = window.evo.bluetooth
        if(UUID.length == 36)
        {
            for(var name in me.bluetoothCharacteristics)
            {
                var code = me.bluetoothCharacteristics[name]
                var part = UUID.substring(4,8)
                if (part == code)
                {
                    rv = name
                    break
                }
            }
        }
        return rv
    },

    discover: function(callback)
    {
        var me = window.evo.bluetooth
        hyper.log('bluetooth.discover called')

        var characteristic =
        {
            name: 'characteristic',

            subscribeTo: function(params, interval, cb)
            {
                hyper.log('bluetooth.characteristic.subscribeto called with interval '+interval)
                hyper.log(JSON.stringify(params))

                var device = params.device
                var serviceUUID = params.serviceUUID
                var characteristicUUID = params.characteristicUUID

                var sid = setInterval(function()
                {
                    device.readCharacteristic(characteristicUUID, function(data)
                    {
                        hyper.log('BLE characteristic data: ' + data);
                        //
                        //
                        // - TODO: Identify which types of characteristics are OK as plots, OK as watches and OK as statics
                        //
                        //
                        var data = evothings.ble.fromUtf8(data)
                        cb({value: data, type: 'plot'})
                    },
                    function(errorCode)
                    {
                       console.log('BLE readServiceCharacteristic error: ' + errorCode);
                    });
                }, interval)
                me.subscriptions[sid] = characteristic
                return sid
            },
            unSubscribeTo: function(sid)
            {
                hyper.log('bluetooth.characteristic.unsubscribeto called')
                clearTimeout(sid)
            }
        }

        //
        //------------------------------------------ Register all services
        //
        me.services[characteristic.name] = characteristic
        //
        //------------------------------------------
        //
        if(callback)
        {
            callback(me.services)
        }
    },

    selectHierarchy:function(path, callback)
    {
        hyper.log('* bluetooth.selectHierarchy called for path '+path+' typeof path = '+(typeof path))
        var me = window.evo.bluetooth
        var levels = path.split('.')

        var address = undefined
        var deviceHandle = undefined
        var device = undefined

        if(levels[0] == 'bluetooth')
        {
            if(me.devices && me.devices.keys && me.devices.keys.length > 0)
            {
                evothings.easyble.reset()
                return
            }
            if(levels.length < 2)
            {
                evothings.easyble.startScan(
                    function(device)
                    {
                        // Report success. Sometimes an RSSI of +127 is reported.
                        // We filter out these values here.
                        if(!me.devices[device.address])
                        {
                            if (device.rssi <= 0 && !me.devices[device.address])
                            {
                                me.devices[device.address] = device
                                //{"address":"C3:EE:68:01:33:62","rssi":-77,"name":"estimote","scanRecord":"AgEGGv9MAAIVuUB/MPX4Rm6v+SVVa1f+bTNiaAG2CQllc3RpbW90ZQ4WChhiMwFo7sO2YjMBaAAAAAAAAAA="}
                                var name = device.name ? device.name + '['+device.address + ']' : device.address
                                callback([{name: 'bluetooth.'+name, selectable: true}])
                            }
                        }
                    },
                    function(errorCode)
                    {
                        hyper.log('bluetooth scan error: '+errorCode)
                    }
                )
                setTimeout(function()
                {
                    evothings.ble.stopScan()
                    hyper.log('stopping BLE scan')
                },60000)
            }
            else
            {
                address = me.getAddressFromLevels(levels)
                var r = me.connections[address]
                if(r)
                {
                    deviceHandle = r.deviceHandle
                }
                device = me.devices[address]
                hyper.log('deviceHandle is '+deviceHandle)
            }
            //----------------------------------------------------------------------------------------
            if(levels.length == 2)
            {
                // device selected
                hyper.log('bluetooth device '+device+' selected')
                if(!me.connections[address])
                {
                    hyper.log('could not find saved device handle. connecting to address '+address)
                    device.connect(function (r)
                    {
                        hyper.log('bleconnect to '+address+' got back')
                        hyper.log(JSON.stringify(r))
                        me.connections[address] = r
                        me.sendServiceHierarchyFor(device, path, callback)
                    },function(err)
                    {
                        hyper.log('connect ERROR: '+err+' -> '+me.getErrorDescription(err))

                    })
                }
                else
                {
                    me.sendServiceHierarchyFor(device, path, callback)
                }
            }
            else if(levels.length == 3)
            {
                var serviceName = levels[2]
                var serviceUUID = me.getUUIDFromName(serviceName)
                var service = me.getServiceFromDevice(device, serviceUUID)
                hyper.log('bluetooth service '+service+' selected on device '+device+' for serviceName '+serviceName+' and sUUID '+serviceUUID)
                if(service)
                {
                    for (var characteristicUUID in service.__characteristics)
                    {
                        var ch = service.__characteristics[characteristicUUID]
                        //hyper.log('callback for characteristics!')
                        // {"handle":11,"uuid":"b9401001-f5f8-466e-aff9-25556b57fe6d","permissions":0,"properties":8,"writeType":2,"device":14,"service":3}
                        // {"handle":9,"uuid":"00002a04-0000-1000-8000-00805f9b34fb","permissions":0,"properties":2,"writeType":2,"device":14,"service":1}
                        hyper.log('* characteristic found ' + JSON.stringify(ch))
                        var cname = me.getNameForCharactersticUUID(ch.uuid)
                        if (cname)
                        {
                            cname += '[' + ch.uuid + ']'
                        }
                        else
                        {
                            cname = ch.uuid
                        }
                        cname = path + '.' + cname
                        me.characteristics[cname] = ch
                        hyper.log('calling back characteristic ' + cname)
                        callback([{name: cname, selectable: false}])
                    }
                }
                else
                {
                    hyper.log('ERROR: Service not found! device has '+device.__services.length+' services')
                    hyper.log(JSON.stringify(device.__services))
                }
            }
        }
        else
        {
            callback([])
        }
    },

    getErrorDescription: function(n)
    {
        rv = ''
        if(n == 2) rv = 'STATUS_CODE_UNKNOWN_CONNECTION_IDENTIFIER'
        if(n == 8) rv = 'CONNECTION_TIMEOUT'
        if(n == 58) rv = 'CONTROLLER_BUSY'
        if(n == 19) rv = 'REMOTE_USER_TERMINATED_CONNECTION'
        if(n == 128) rv = 'GATT_NO_RESOURCES'
        if(n == 132) rv = 'GATT_BUSY'
        if(n == 133) rv = 'GATT_ERROR'
        return rv
    },

    getServiceFromDevice:function(device, sUUID)
    {
        var rv = undefined
        device.__services.forEach(function(service)
        {
            if(service.uuid == sUUID)
            {
                rv = service
            }
        })
        return rv
    },

    getUUIDFromName: function(name)
    {
        rv = name
        if(name.indexOf('[') > -1)
        {
            rv = name.substring(name.indexOf('[')+1, name.indexOf(']'))
        }
        return rv
    },

    getAddressFromLevels: function(levels)
    {
        var address = levels[1]
        if(address.indexOf('[') > -1)
        {
            address = address.substring(address.indexOf('[')+1, address.indexOf(']'))
        }
        return address
    },

    sendServiceHierarchyFor: function(device, path, callback)
    {
        var me = window.evo.bluetooth
        if(evothings && evothings.ble && device)
        {
            hyper.log('connected, requesting services...');
            device.readServices(
                null,
                function(services)
                {
                    hyper.log('got services')
                    for(var sUUID in device.__services)
                    {
                        var service = device.__services[sUUID]
                        hyper.log('sending service '+JSON.stringify(service))
                        // handle,uuid,type
                        var name = me.getNameForServiceUUID(service.uuid)
                        if(name)
                        {
                            name = name += '['+service.uuid+']'
                        }
                        else
                        {
                            name = service.uuid
                        }
                        var sname = path+'.'+name
                        me.serviceHandles[sname] = service.handle
                        hyper.log('saving service as '+sname)
                        hyper.log(JSON.stringify(service))
                        callback([{name: sname, selectable: true}])
                    }
                },function(err)
                {
                    hyper.log('get services ERROR: '+err)
                })
        }
    },

    subscribeTo: function(path, params, interval, callback)
    {
        var levels = path.split('.')
        var me = window.evo.bluetooth
        hyper.log('bluetooth.subscribeTo called for path '+path+' and interval '+interval+' levels = '+levels.length)
        var me = window.evo.bluetooth
        var address = me.getAddressFromLevels(levels)
        var device = me.devices[address]
        hyper.log('subscribeTo looking up address '+address+' connected device -> '+device)
        hyper.log(JSON.stringify(device))
        var serviceName = levels[2]
        var serviceUUID = serviceName
        if(serviceUUID.indexOf('[') > -1)
        {
            serviceUUID = serviceUUID.substring(serviceUUID.indexOf('[')+1, serviceUUID.indexOf(']'))
        }
        if(levels.length == 4)
        {
            var characteristic = me.characteristics[path]
            hyper.log('resolved characteristic uuid = '+characteristic.uuid)
            var service = me.services['characteristic']
            if(service)
            {
                var params = {device: device, serviceUUID: serviceUUID, characteristicUUID: characteristic.uuid}
                var sid = service.subscribeTo(params, interval, callback)
                me.subscriptions[sid] = service
                return sid
            }
        }

    },
    unSubscribeTo: function(sid)
    {
        hyper.log('bluetooth.unSubscribeTo called for sid '+sid)
        var me = window.evo.bluetooth
        var service = me.subscriptions[sid]
        if(service)
        {
            service.unSubscribeTo(sid)
        }
    }
}

me.discover()
*/
