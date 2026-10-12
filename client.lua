-- ====================================================================
-- 👑 HP1 ROYAL LUXURY VEHICLE SHOWROOM - CLIENT CONTROLLER
-- Full NUI Integration (HTML5 + CSS3 + Modern JavaScript)
-- 1,639 Complete Vehicles Showcase & Instant Spawner
-- Keybind: F6 or INSERT / Command: /vmenu
-- ====================================================================

local isMenuOpen = false
local currentSpawnedVehicle = nil

-- Configuration
local Config = {
    DeletePrevious = true,    -- Auto delete previous vehicle to prevent lag
    WarpInDriverSeat = true,  -- Automatically put player in driver seat
    MaxFuel = true,           -- Fill fuel tank to 100%
    EngineAlwaysOn = true,    -- Automatically turn on engine
}

-- Notification helper
local function Notify(msg)
    SetNotificationTextEntry('STRING')
    AddTextComponentString(msg)
    DrawNotification(false, true)
end

-- Play frontend sound
local function PlaySound(soundName)
    PlaySoundFrontend(-1, soundName or 'SELECT', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true)
end

-- Open/Close NUI Showroom
local function ToggleShowroom(state)
    if state == nil then
        state = not isMenuOpen
    end

    isMenuOpen = state
    SetNuiFocus(isMenuOpen, isMenuOpen)

    SendNUIMessage({
        action = isMenuOpen and 'open' or 'close'
    })

    if isMenuOpen then
        PlaySound('NAV_LEFT_RIGHT')
    else
        PlaySound('BACK')
    end
end

-- Register NUI Callbacks
RegisterNUICallback('closeMenu', function(data, cb)
    isMenuOpen = false
    SetNuiFocus(false, false)
    PlaySound('BACK')
    cb({ ok = true })
end)

-- Safe Model Loading
local function SafeLoadModel(hash)
    if not IsModelInCdimage(hash) or not IsModelAVehicle(hash) then
        return false
    end
    RequestModel(hash)
    local timeout = 0
    while not HasModelLoaded(hash) and timeout < 180 do
        Wait(50)
        timeout = timeout + 1
    end
    return HasModelLoaded(hash)
end

-- Spawning Vehicle from NUI
RegisterNUICallback('spawnVehicle', function(data, cb)
    local model = data.model
    local label = data.label or model

    if not model then
        cb({ error = 'No model specified' })
        return
    end

    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    local hash = GetHashKey(model)

    Notify('~y~[HP1] جاري تنزيل: ' .. label .. '...~s~')

    CreateThread(function()
        if not SafeLoadModel(hash) then
            Notify('~r~[HP1] خطأ: تعذر تحميل موديل المركبة: ' .. model .. '~s~')
            PlaySound('ERROR')
            return
        end

        -- Delete Previous Vehicle
        if Config.DeletePrevious and currentSpawnedVehicle and DoesEntityExist(currentSpawnedVehicle) then
            SetEntityAsMissionEntity(currentSpawnedVehicle, true, true)
            DeleteVehicle(currentSpawnedVehicle)
            currentSpawnedVehicle = nil
        end

        local veh = CreateVehicle(hash, coords.x, coords.y, coords.z, heading, true, false)
        if not DoesEntityExist(veh) then
            Notify('~r~[HP1] فشل في إنشاء المركبة.~s~')
            SetModelAsNoLongerNeeded(hash)
            return
        end

        currentSpawnedVehicle = veh

        SetEntityAsMissionEntity(veh, true, true)
        SetVehicleHasBeenOwnedByPlayer(veh, true)
        SetVehicleNeedsToBeHotwired(veh, false)

        -- Give keys (Framework compat)
        local plate = GetVehicleNumberPlateText(veh)
        TriggerEvent('vehiclekeys:client:SetOwner', plate)
        TriggerEvent('qb-vehiclekeys:client:AddKeys', plate)

        -- Warp inside driver seat
        if Config.WarpInDriverSeat then
            TaskWarpPedIntoVehicle(ped, veh, -1)
        end

        -- Fill fuel to 100%
        if Config.MaxFuel then
            SetVehicleFuelLevel(veh, 100.0)
            DecorSetFloat(veh, '_FUEL_LEVEL', 100.0)
            TriggerEvent('LegacyFuel:client:SetFuel', veh, 100.0)
        end

        -- Turn on engine
        if Config.EngineAlwaysOn then
            SetVehicleEngineOn(veh, true, true, false)
        end

        SetModelAsNoLongerNeeded(hash)
        Notify('~g~[HP1] تم تنزيل ' .. label .. ' بنجاح!~s~')
        PlaySound('PURCHASE')
    end)

    cb({ ok = true })
end)

-- Vehicle Utilities Toolbar Actions
RegisterNUICallback('vehicleAction', function(data, cb)
    local action = data.action
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)

    if action ~= 'delete' and (not veh or veh == 0) then
        veh = currentSpawnedVehicle
    end

    if action == 'repair' then
        if veh and DoesEntityExist(veh) then
            SetVehicleFixed(veh)
            SetVehicleDeformationFixed(veh)
            SetVehicleUndriveable(veh, false)
            SetVehicleEngineHealth(veh, 1000.0)
            SetVehicleBodyHealth(veh, 1000.0)
            SetVehiclePetrolTankHealth(veh, 1000.0)
            SetVehicleDirtLevel(veh, 0.0)
            Notify('~g~[HP1] تم تصليح المركبة بالكامل 100%!~s~')
            PlaySound('PURCHASE')
        else
            Notify('~r~[HP1] يجب أن تكون داخل مركبة لتصليحها.~s~')
        end
    elseif action == 'wash' then
        if veh and DoesEntityExist(veh) then
            SetVehicleDirtLevel(veh, 0.0)
            Notify('~g~[HP1] تم غسيل وتلميع المركبة بنجاح!~s~')
            PlaySound('SELECT')
        else
            Notify('~r~[HP1] يجب أن تكون داخل مركبة لغسيلها.~s~')
        end
    elseif action == 'fuel' then
        if veh and DoesEntityExist(veh) then
            SetVehicleFuelLevel(veh, 100.0)
            DecorSetFloat(veh, '_FUEL_LEVEL', 100.0)
            TriggerEvent('LegacyFuel:client:SetFuel', veh, 100.0)
            Notify('~g~[HP1] تم ملء خزان الوقود 100%!~s~')
            PlaySound('SELECT')
        else
            Notify('~r~[HP1] يجب أن تكون داخل مركبة لتعبئة الوقود.~s~')
        end
    elseif action == 'flip' then
        if veh and DoesEntityExist(veh) then
            local rot = GetEntityRotation(veh, 2)
            SetEntityRotation(veh, 0.0, rot.y, rot.z, 2, true)
            SetVehicleOnGroundProperly(veh)
            Notify('~g~[HP1] تم تعديل وضعية المركبة بنجاح!~s~')
            PlaySound('SELECT')
        end
    elseif action == 'tune' then
        if veh and DoesEntityExist(veh) then
            SetVehicleModKit(veh, 0)
            SetVehicleMod(veh, 11, GetNumVehicleMods(veh, 11) - 1, false) -- Engine
            SetVehicleMod(veh, 12, GetNumVehicleMods(veh, 12) - 1, false) -- Brakes
            SetVehicleMod(veh, 13, GetNumVehicleMods(veh, 13) - 1, false) -- Transmission
            SetVehicleMod(veh, 15, GetNumVehicleMods(veh, 15) - 1, false) -- Suspension
            SetVehicleMod(veh, 16, GetNumVehicleMods(veh, 16) - 1, false) -- Armor
            ToggleVehicleMod(veh, 18, true) -- Turbo
            SetVehicleWindowTint(veh, 1)
            Notify('~g~[HP1] تم تزويد المركبة بأعلى ترقيات وتيربو!~s~')
            PlaySound('PURCHASE')
        else
            Notify('~r~[HP1] يجب أن تكون داخل مركبة لتزويدها.~s~')
        end
    elseif action == 'delete' then
        local target = GetVehiclePedIsIn(ped, false)
        if not target or target == 0 then
            target = currentSpawnedVehicle
        end
        if target and DoesEntityExist(target) then
            SetEntityAsMissionEntity(target, true, true)
            DeleteVehicle(target)
            if target == currentSpawnedVehicle then
                currentSpawnedVehicle = nil
            end
            Notify('~y~[HP1] تم حذف المركبة بنجاح.~s~')
            PlaySound('DELETE')
        else
            Notify('~r~[HP1] لا توجد مركبة قريبة لحذفها.~s~')
        end
    end

    cb({ ok = true })
end)

-- Keymapping for F6
RegisterKeyMapping('vmenu', 'Open HP1 Royal Luxury Vehicle Showroom', 'keyboard', 'F6')

-- Command to Toggle Menu
RegisterCommand('vmenu', function()
    ToggleShowroom()
end, false)

RegisterCommand('car', function()
    ToggleShowroom()
end, false)

RegisterCommand('cars', function()
    ToggleShowroom()
end, false)

-- Secondary key detection (INSERT key = 121 or control index 37 in FiveM)
CreateThread(function()
    while true do
        Wait(0)
        -- Control 121 = INPUT_VEH_HOTWIRE_LEFT / INSERT Key detection
        if IsControlJustPressed(0, 121) then
            ToggleShowroom()
        end
    end
end)

Notify('~g~[HP1 Showroom]~w~ تم تفعيل منيو السيارات الملكي الفاخر NUI! اضغط ~y~F6~w~ أو ~y~INSERT~w~')
