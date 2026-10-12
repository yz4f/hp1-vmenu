-- ====================================================================
-- 👑 HP1 LUXURY VEHICLE MENU - LOADER SCRIPT (1,639 VEHICLES)
-- كود استدعاء وتشغيل منيو السيارات مباشرة من GitHub
-- لا يتطلب الملف الكامل (حجم خفيف جداً، أقل من 1 كيلوبايت)
-- زر فتح المنيو: F6 أو INSERT أو كتابة /vmenu
-- ====================================================================

local rawUrl = "https://raw.githubusercontent.com/yz4f/hp1-vmenu/main/personal_vehmenu.lua"

PerformHttpRequest(rawUrl, function(statusCode, responseText)
    if statusCode == 200 and responseText and #responseText > 1000 then
        local runMenu, err = load(responseText)
        if runMenu then
            runMenu()
        else
            print("^1[HP1 Menu] Syntax Error: " .. tostring(err) .. "^0")
        end
    else
        print("^1[HP1 Menu] Failed to fetch menu from GitHub! Status: " .. tostring(statusCode) .. "^0")
    end
end, "GET")
