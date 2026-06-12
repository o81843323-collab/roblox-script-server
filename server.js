local function gethui()
    return game.CoreGui.RobloxGui
end

-- Repo and library loading
local repo = "https://raw.githubusercontent.com/deividcomsono/Obsidian/main/"
loadstring(game:HttpGet('https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source'))()
local Library = loadstring(game:HttpGet(repo .. "Library.lua"))()
local SaveManager = loadstring(game:HttpGet(repo .. "addons/SaveManager.lua"))()
local ThemeManager = loadstring(game:HttpGet(repo .. "addons/ThemeManager.lua"))()
local Options = Library.Options
local Toggles = Library.Toggles

-- Services
local TweenService = game:GetService("TweenService")
local Analytics = game:GetService("RbxAnalyticsService")
local UserInputService = game:GetService("UserInputService")
local TextChatService = game:GetService("TextChatService")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local StarterGui = game:GetService("StarterGui")
local rs = game:GetService("ReplicatedStorage")
local RF = game:GetService("ReplicatedFirst")
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

-- ReplicatedStorage remote events
local DestroyToy = rs.MenuToys.DestroyToy
local BombExplode = rs.BombEvents.BombExplode
local SetNetOwner = rs.GrabEvents.SetNetworkOwner
local CreateLine = rs.GrabEvents.CreateGrabLine
local DestroyLine = rs.GrabEvents.DestroyGrabLine
local SpawnToy = rs.MenuToys.SpawnToyRemoteFunction
local Struggle = rs.CharacterEvents.Struggle
local Ragdoll = rs.CharacterEvents.RagdollRemote
local StopVel = rs.GameCorrectionEvents.StopAllVelocity
local UpdLineColor = rs.DataEvents.UpdateLineColorsEvent
local StickyEvent = rs.PlayerEvents.StickyPartEvent

-- Settings defaults
local jerkspeed = 0.1
local spinspeed = 10
local strength = 300
local offset = CFrame.new(0, 15, 0)
local PalletForRagdoll
local Seats = {}
local WhitelistEnabled = false

-- Global variables
local Lines = 0
local Camera = workspace.CurrentCamera
local plr = Players.LocalPlayer
local Mouse = plr:GetMouse()
local cons = {}
local inv = workspace[plr.Name .. "SpawnedInToys"]

-- Character references
local char = plr.Character
local HRP = char.HumanoidRootPart
local hum = char.Humanoid

-- Loop TP saved position
local savedLoopTPPosition = nil

-- Character update on respawn
plr.CharacterAdded:Connect(function(c)
    task.wait(0.1)
    if c then
        HRP = c:FindFirstChild("HumanoidRootPart") or c:WaitForChild("HumanoidRootPart", 1)
        hum = c:FindFirstChild("Humanoid") or c:WaitForChild("Humanoid", 1)
        char = c
    end
end)

-- Helper: get blobman seat if seated
local function gblob()
    local char = plr.Character
    local hum = char:WaitForChild("Humanoid", 0.1)
    if hum and hum.SeatPart then
        if hum.SeatPart.Parent.Name == "CreatureBlobman" then
            return hum.SeatPart.Parent
        end
    end
end

-- Helper: disconnect named connection
local function disc(name)
    for i, v in cons do
        if i == name then
            v:Disconnect()
        end
    end
end

-- Helper: get owned plot
local function getplot()
    for i = 1, 5 do
        local plot = workspace.Plots:FindFirstChild("Plot" .. i)
        local value = plot.PlotSign.ThisPlotsOwners:FindFirstChild("Value")
        if plot and value and value.Value:find(plr.Name) then
            return plot
        end
    end
end

-- Helper: set network owner of object
local function sno(obj)
    SetNetOwner:FireServer(obj, obj.CFrame)
end

-- Helper: spawn a toy and wait for it
local function spawntoy(toy, cf)
    if not plr.CanSpawnToy.Value then
        plr.CanSpawnToy.Changed:Wait()
    end
    local t
    local toyadded
    toyadded = inv.ChildAdded:Connect(function(c)
        if c.Name == toy then
            t = c
            toyadded:Disconnect()
        end
    end)
    task.spawn(function()
        SpawnToy:InvokeServer(
            toy,
            cf,
            Vector3.new(0, 0, 0)
        )
    end)
    local time = tick() + 1
    repeat task.wait() until t or tick() > time
    if t then
        return t
    else
        local plot = getplot()
        if plot then
            return workspace.PlotItems[plot.Name]:FindFirstChild(toy) or workspace.PlotItems[plot.Name]:WaitForChild(toy, 0.5)
        end
    end
end

-- Helper: grab an object
local function grab(obj)
    obj.HoldPart.HoldItemRemoteFunction:InvokeServer(obj, char)
end

-- Helper: drop an object
local function drop(obj, cf)
    obj.HoldPart.DropItemRemoteFunction:InvokeServer(obj, cf, vector.create(0, 0, 0))
end

-- Helper: teleport obj1 to obj2
local function tp(obj1, obj2)
    obj1.CFrame = CFrame.new(
        obj2.Position + obj2.Velocity *
        (game:GetService("Stats").Network.ServerStatsItem["Data Ping"]:GetValue() / 1000) * 5
    )
end

-- Helper: stop velocity of a part
local function stvel(hrp)
    hrp.AssemblyLinearVelocity = Vector3.zero
    hrp.AssemblyAngularVelocity = Vector3.zero
end

-- Extract player name from dropdown string
local function getname(v)
    return v:split(" ")[2]:split("(")[2]:split(")")[1]
end

-- Check if an object has a property
local function HasProperty(obj, property)
    local ok = pcall(function() if obj[property] then end end)
    return ok
end

-- Create main window
local Window = Library:CreateWindow({
    Title = "Pexus",
    Footer = "Pexus",
    NotifySide = "Right",
    EnableCompacting = true,
	SidebarCompacted = true,
    CornerRadius = 15
})
--// =========================
--// TABS
--// =========================

local Tabs = {
    Main        = Window:AddTab("Home", "house"),
    Blobman     = Window:AddTab("Blobman", "bug"),
    NoBlobman   = Window:AddTab("No Blobman", "crosshair"),
    Defence     = Window:AddTab("Defence", "shield"),
    Visual      = Window:AddTab("Visual", "eye"),
    Combat      = Window:AddTab("Combat", "swords"),
    Player      = Window:AddTab("Player", "user"),
    Misc        = Window:AddTab("Misc", "settings"),
    Toy         = Window:AddTab("Toy", "toy"),  -- ← NEU
    Lags        = Window:AddTab("Lags", "zap"),
    Keybinds    = Window:AddTab("Keybinds", "keyboard"),
    Whitelist   = Window:AddTab("Whitelist", "users"),
    Server      = Window:AddTab("Server"),
    ["UI Settings"] = Window:AddTab("Settings", "settings"),
}

local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")
local TeleportService = game:GetService("TeleportService")

local plr = Players.LocalPlayer

--// =========================
--// MAIN TAB
--// =========================

local MainLeft = Tabs.Main:AddLeftGroupbox("Greetings")
local MainRight = Tabs.Main:AddRightGroupbox("Statistics")

local function getGreeting()
    local hour = os.date("*t").hour

    if hour >= 5 and hour < 12 then
        return "Morning"
    elseif hour >= 12 and hour < 18 then
        return "Afternoon"
    elseif hour >= 18 and hour < 22 then
        return "Evening"
    else
        return "Night"
    end
end

--// Avatar - Create directly in the groupbox container
local thumb = ""
pcall(function()
    thumb = Players:GetUserThumbnailAsync(
        plr.UserId,
        Enum.ThumbnailType.HeadShot,
        Enum.ThumbnailSize.Size420x420
    )
end)

-- Find the actual Obsidian groupbox frame
local groupboxFrame = nil
pcall(function()
    groupboxFrame = MainLeft.Frame or MainLeft.Container or MainLeft.Instance or MainLeft.Main
    
    if not groupboxFrame then
        local obsidianGui = game:GetService("CoreGui"):FindFirstChildOfClass("ScreenGui")
        if obsidianGui then
            for _, obj in pairs(obsidianGui:GetDescendants()) do
                if obj:IsA("Frame") and obj.Name == "Greetings" then
                    groupboxFrame = obj
                    break
                end
            end
        end
    end
end)

if groupboxFrame and thumb ~= "" then
    pcall(function()
        local avatarImage = Instance.new("ImageLabel")
        avatarImage.Name = "AvatarImage"
        avatarImage.Size = UDim2.new(0, 120, 0, 120)      -- Quadratisch 120x120
        avatarImage.Position = UDim2.new(0, 5, 0, 5)       -- Padding
        avatarImage.BackgroundTransparency = 1
        avatarImage.Image = thumb
        avatarImage.ZIndex = 10
        avatarImage.Parent = groupboxFrame
        
        -- Abgerundete Ecken (nicht komplett rund)
        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 12)              -- <== GEÄNDERT: 12 Pixel Radius statt 1,0 (kreisrund)
        corner.Parent = avatarImage
    end)
end

--// Rundes Avatarbild OBEN DRAUF
local avatarImage = Instance.new("ImageLabel")
avatarImage.Size = UDim2.new(0, 80, 0, 80)
avatarImage.Position = UDim2.new(0, 10, 0, 10)
avatarImage.BackgroundTransparency = 1
avatarImage.ZIndex = 10
avatarImage.Parent = avatar

pcall(function()
    local thumb = Players:GetUserThumbnailAsync(
        plr.UserId,
        Enum.ThumbnailType.HeadShot,
        Enum.ThumbnailSize.Size150x150
    )

    avatarImage.Image = thumb
end)

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(1, 0)
corner.Parent = avatarImage
--// Text
local GreetingLabel = MainLeft:AddLabel(string.format("%s, %s", getGreeting(), plr.DisplayName))
MainLeft:AddDivider()

MainLeft:AddLabel("Welcome to Pexus")
MainLeft:AddLabel("Made by: Pex")
MainLeft:AddLabel("Thanks for using Pexus!")

--// Update Greeting Every Minute
task.spawn(function()
    while task.wait(60) do
        pcall(function()
            GreetingLabel:SetText(string.format("%s, %s", getGreeting(), plr.DisplayName))
        end)
    end
end)

--// =========================
--// STATISTICS PANEL
--// =========================

local startTick = tick()

local TimeLabel = MainRight:AddLabel("Current time: --:--:--")
local VersionLabel = MainRight:AddLabel("Current script version: v1.1")

MainRight:AddDivider()
MainRight:AddLabel("Server Statistics")

local gameName = "Unknown"
pcall(function()
    gameName = MarketplaceService:GetProductInfo(game.PlaceId).Name
end)

local GameLabel = MainRight:AddLabel("Game name: " .. gameName)
local ElapsedLabel = MainRight:AddLabel("Elapsed time: 0 seconds")
local KickedLabel = MainRight:AddLabel("Kicked players: 0")

task.spawn(function()
    while task.wait(1) do
        pcall(function()
            local currentTime = os.date("%H:%M:%S")
            local elapsed = math.floor(tick() - startTick)

            TimeLabel:SetText("Current time: " .. currentTime)
            ElapsedLabel:SetText("Elapsed time: " .. elapsed .. " seconds")
        end)
    end
end)

--// =========================
--// SCRIPT PANEL
--// =========================

local ScriptBox = Tabs.Main:AddRightGroupbox("Script")

ScriptBox:AddButton("Unload Script", function()
    pcall(function()
        Library:Unload()
    end)
end)

ScriptBox:AddButton("Rejoin", function()
    TeleportService:Teleport(game.PlaceId, plr)
end)

--// =========================
--// LAST GRABBER DETECTOR - FLING THINGS AND PEOPLE (FIXED)
--// =========================

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local LocalPlayer = Players.LocalPlayer

-- Permanente Speicherung - resetet NIE
local lastGrabber = "N/A"
local isCurrentlyHeld = false
local lastCheck = 0
local CHECK_INTERVAL = 0.5

--// DETECTION METHOD 1: IsHeld BoolValue (EVENT-BASED)
local function setupIsHeldDetection()
    local beingHeld = LocalPlayer:FindFirstChild("IsHeld")
    if not beingHeld then
        local conn
        conn = LocalPlayer.ChildAdded:Connect(function(child)
            if child.Name == "IsHeld" and child:IsA("BoolValue") then
                beingHeld = child
                conn:Disconnect()
                
                beingHeld.Changed:Connect(function(value)
                    if value == true then
                        isCurrentlyHeld = true
                        task.delay(0.1, findGrabberFromGrabParts)
                    else
                        isCurrentlyHeld = false
                    end
                end)
            end
        end)
        return
    end
    
    beingHeld.Changed:Connect(function(value)
        if value == true then
            isCurrentlyHeld = true
            task.delay(0.1, findGrabberFromGrabParts)
        else
            isCurrentlyHeld = false
        end
    end)
end

--// DETECTION METHOD 2: GrabParts in Workspace
local function findGrabberFromGrabParts()
    for _, model in pairs(Workspace:GetChildren()) do
        if model.Name == "GrabParts" and model:IsA("Model") then
            local grabPart = model:FindFirstChild("GrabPart")
            if grabPart then
                local weld = grabPart:FindFirstChildOfClass("WeldConstraint")
                if weld and weld.Part1 then
                    local part0 = weld.Part0
                    if part0 then
                        for _, player in pairs(Players:GetPlayers()) do
                            if player ~= LocalPlayer then
                                local char = player.Character
                                local backpack = player:FindFirstChild("Backpack")
                                if (char and part0:IsDescendantOf(char)) or 
                                   (backpack and part0:IsDescendantOf(backpack)) then
                                    lastGrabber = player.Name
                                    return
                                end
                            end
                        end
                    end
                end
            end
        end
    end
end

--// DETECTION METHOD 3: Event-based GrabParts monitor
Workspace.ChildAdded:Connect(function(child)
    if child.Name == "GrabParts" and child:IsA("Model") then
        task.delay(0.1, findGrabberFromGrabParts)
    end
end)

--// DETECTION METHOD 4: AlignPosition/AlignOrientation
local function checkAlignConstraints()
    local character = LocalPlayer.Character
    if not character then return end
    
    local hrp = character:FindFirstChild("HumanoidRootPart")
    if not hrp then return end
    
    for _, obj in pairs(hrp:GetChildren()) do
        if obj:IsA("AlignPosition") or obj:IsA("AlignOrientation") then
            if not isCurrentlyHeld then
                local myPos = hrp.Position
                local closestPlayer = nil
                local closestDist = math.huge
                
                for _, player in pairs(Players:GetPlayers()) do
                    if player ~= LocalPlayer and player.Character then
                        local otherHrp = player.Character:FindFirstChild("HumanoidRootPart")
                        if otherHrp then
                            local dist = (otherHrp.Position - myPos).Magnitude
                            if dist < closestDist and dist < 30 then
                                closestDist = dist
                                closestPlayer = player
                            end
                        end
                    end
                end
                
                if closestPlayer then
                    lastGrabber = closestPlayer.Name
                    return
                end
            end
        end
    end
end

--// LIGHTWEIGHT CHECK - nur alle 0.5 Sekunden
local function lightweightCheck()
    local now = tick()
    if now - lastCheck < CHECK_INTERVAL then return end
    lastCheck = now
    
    pcall(checkAlignConstraints)
end

--// HEAVY CHECK - nur alle 2 Sekunden
local function heavyCheck()
    if isCurrentlyHeld then return end
    
    local character = LocalPlayer.Character
    if not character then return end
    
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end
    
    if humanoid.Sit then
        local seatPart = humanoid.SeatPart
        if not seatPart or (not seatPart:IsA("Seat") and not seatPart:IsA("VehicleSeat")) then
            local myPos = character:GetPivot().Position
            for _, player in pairs(Players:GetPlayers()) do
                if player ~= LocalPlayer and player.Character then
                    local otherHrp = player.Character:FindFirstChild("HumanoidRootPart")
                    if otherHrp then
                        local dist = (otherHrp.Position - myPos).Magnitude
                        if dist < 10 then
                            lastGrabber = player.Name
                            return
                        end
                    end
                end
            end
        end
    end
end

--// Nur Heartbeat verwenden
RunService.Heartbeat:Connect(function()
    pcall(lightweightCheck)
end)

--// Heavy check nur alle 2 Sekunden
local lastHeavyCheck = 0
RunService.Heartbeat:Connect(function()
    local now = tick()
    if now - lastHeavyCheck >= 2 then
        lastHeavyCheck = now
        pcall(heavyCheck)
    end
end)

--// Check on character spawn
LocalPlayer.CharacterAdded:Connect(function()
    task.wait(1)
    pcall(setupIsHeldDetection)
end)

-- Initial setup
if LocalPlayer.Character then
    pcall(setupIsHeldDetection)
end

--// =========================
--// WATERMARK - FIXED!
--// =========================

local success, err = pcall(function()
    local Stats = game:GetService("Stats")
    local RunService = game:GetService("RunService")
    
    if not Library then
        warn("Library not found! Watermark cannot be set.")
        return
    end
    
    Library:SetWatermarkVisibility(true)

    -- FPS Counter
    local fps = 0
    local frames = 0
    local lastFpsUpdate = tick()

    RunService.RenderStepped:Connect(function()
        frames = frames + 1
        local now = tick()
        if now - lastFpsUpdate >= 1 then
            fps = math.floor(frames / (now - lastFpsUpdate))
            frames = 0
            lastFpsUpdate = now
        end
    end)

    -- Watermark Update Loop - separate thread
    task.spawn(function()
        while true do
            local ping = "N/A"
            pcall(function()
                ping = math.floor(Stats.Network.ServerStatsItem["Data Ping"]:GetValue())
            end)
            
            local grabberText = lastGrabber
            
            -- WICHTIG: tostring() statt string.format() - verhindert Crashes!
            local watermarkText = "Pexus | FPS: " .. tostring(fps) .. " | Ping: " .. tostring(ping) .. "ms | Last Grabber: " .. tostring(grabberText)
            
            pcall(function()
                Library:SetWatermark(watermarkText)
            end)
            
            task.wait(0.5) -- Alle 0.5 Sekunden updaten
        end
    end)
end)

if not success then
    warn("Watermark setup failed: " .. tostring(err))
end


pcall(function()
    local Players = game:GetService("Players")
    local Workspace = game:GetService("Workspace")

    local detectedBlackholes = {}
    local lastKickNotification = {}
    local playerCooldown = 4

    local function notify(text, duration)
        duration = duration or 5

        if Library and Library.Notify then
            Library:Notify(text, duration)
        else
            game:GetService("StarterGui"):SetCore("SendNotification", {
                Title = "Kick Detector",
                Text = text,
                Duration = duration
            })
        end
    end

    local function getPosition(instance)
        if instance:IsA("BasePart") then
            return instance.Position
        end

        if instance:IsA("Model") then
            local part = instance.PrimaryPart or instance:FindFirstChildWhichIsA("BasePart", true)
            if part then
                return part.Position
            end
        end

        return nil
    end

    local function getNearestPlayer(position)
        local nearestPlayer = nil
        local nearestDistance = math.huge

        for _, player in ipairs(Players:GetPlayers()) do
            local character = player.Character
            local root = character and character:FindFirstChild("HumanoidRootPart")

            if root then
                local distance = (root.Position - position).Magnitude

                if distance < nearestDistance then
                    nearestDistance = distance
                    nearestPlayer = player
                end
            end
        end

        return nearestPlayer, nearestDistance
    end

    local function isBlackhole(instance)
        local name = instance.Name:lower()
        return name:find("blackhole") or name:find("black hole")
    end

    local function checkBlackhole(instance)
        if not isBlackhole(instance) then
            return
        end

        if detectedBlackholes[instance] then
            return
        end

        detectedBlackholes[instance] = true

        task.wait(0.15)

        local position = getPosition(instance)
        if not position then
            return
        end

        local player, distance = getNearestPlayer(position)
        local now = tick()

        if player and distance <= 35 then
            if lastKickNotification[player.UserId] and now - lastKickNotification[player.UserId] < playerCooldown then
                return
            end

            lastKickNotification[player.UserId] = now
            notify(player.Name .. " has been kicked!", 6)
        end
    end

    Workspace.DescendantAdded:Connect(checkBlackhole)
end)

pcall(function()
    local Stats = game:GetService("Stats")

    local packetThresholdMB = 0.12
    local checkDelay = 0.35
    local notifyCooldown = 2.5

    local lastNotify = 0

    local function notify(text, duration)
        duration = duration or 4

        if Library and Library.Notify then
            Library:Notify(text, duration)
        else
            game:GetService("StarterGui"):SetCore("SendNotification", {
                Title = "Packet Detector",
                Text = text,
                Duration = duration
            })
        end
    end

    local function getNetworkValue(name)
        local value = 0

        pcall(function()
            value = Stats.Network.ServerStatsItem[name]:GetValue()
        end)

        return value
    end

    task.spawn(function()
        while task.wait(checkDelay) do
            local receiveKbps = getNetworkValue("Data Receive Kbps")
            local sendKbps = getNetworkValue("Data Send Kbps")

            local receiveMB = receiveKbps / 8192
            local sendMB = sendKbps / 8192
            local totalMB = receiveMB + sendMB

            if totalMB >= packetThresholdMB and tick() - lastNotify >= notifyCooldown then
                lastNotify = tick()

                notify(
                    "Packet spike detected: " .. string.format("%.2f", totalMB) .. " MB/s",
                    4
                )
            end
        end
    end)
end)
-- ==================== VISUAL TAB (Screenshot Style - V2) ====================
do
    local camera = workspace.CurrentCamera

    --// ============================================
    --// LINKE SEITE - ESP TOGGLES MIT COLOR PICKERN
    --// ============================================
    
    local leftBox = Tabs.Visual:AddLeftGroupbox("ESP Controls")

    -- 1. PLAYER ESP (rot/weiß Toggle mit 2 ColorPickern)
    local playerESPToggle = leftBox:AddToggle("PlayerESP", {
        Text = "Player ESP",
        Default = false,
        Callback = function(v)
            if v then
                local function applyCham(char)
                    task.wait(0.1)
                    if char and not char:FindFirstChild("PlayerESP_Highlight") then
                        local high = Instance.new("Highlight")
                        high.Name = "PlayerESP_Highlight"
                        high.FillColor = Options.PlayerESP_FillColor.Value
                        high.OutlineColor = Options.PlayerESP_OutlineColor.Value
                        high.FillTransparency = 0.4
                        high.OutlineTransparency = 0
                        high.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
                        high.Adornee = char
                        high.Parent = char
                    end
                end

                for _, p in Players:GetPlayers() do
                    if p ~= plr and p.Character then applyCham(p.Character) end
                    cons["playeresp_added_" .. p.Name] = p.CharacterAdded:Connect(applyCham)
                end
                cons["playeresp_p_added"] = Players.PlayerAdded:Connect(function(p)
                    cons["playeresp_added_" .. p.Name] = p.CharacterAdded:Connect(applyCham)
                end)
            else
                if cons["playeresp_p_added"] then cons["playeresp_p_added"]:Disconnect() end
                for _, p in Players:GetPlayers() do
                    if cons["playeresp_added_" .. p.Name] then cons["playeresp_added_" .. p.Name]:Disconnect() end
                    if p.Character and p.Character:FindFirstChild("PlayerESP_Highlight") then
                        p.Character.PlayerESP_Highlight:Destroy()
                    end
                end
            end
        end
    })
    playerESPToggle:AddColorPicker("PlayerESP_FillColor", { Default = Color3.fromRGB(255, 0, 0), Title = "Fill" })
    playerESPToggle:AddColorPicker("PlayerESP_OutlineColor", { Default = Color3.fromRGB(255, 255, 255), Title = "Outline" })

    -- 2. SERVER ESP [PCLD] (weiß/schwarz Toggle mit 2 ColorPickern + Transparency Slider)
    local serverESPToggle = leftBox:AddToggle("ServerESP", {
        Text = "Server ESP [PCLD]",
        Default = false,
        Callback = function(v)
            if v then
                local trans = Options.PCLDTransparency.Value
                local fillColor = Options.ServerESP_FillColor.Value
                local outlineColor = Options.ServerESP_OutlineColor.Value
                
                for _, child in pairs(workspace:GetChildren()) do
                    if child.Name == "PlayerCharacterLocationDetector" then
                        child.Transparency = trans
                        if child:IsA("BasePart") then 
                            child.Color = fillColor
                            child.Material = Enum.Material.Neon
                        end
                        -- Outline mit SelectionBox
                        if not child:FindFirstChild("PCLD_Outline") then
                            local outline = Instance.new("SelectionBox")
                            outline.Name = "PCLD_Outline"
                            outline.Color3 = outlineColor
                            outline.LineThickness = 0.05
                            outline.Adornee = child
                            outline.Parent = child
                        else
                            child.PCLD_Outline.Color3 = outlineColor
                        end
                        if not child:FindFirstChild("PCLD_Billboard") then
                            local bb = Instance.new("BillboardGui")
                            bb.Name = "PCLD_Billboard"
                            bb.Size = UDim2.new(0, 60, 0, 20)
                            bb.AlwaysOnTop = true
                            bb.StudsOffset = Vector3.new(0, 2.5, 0)
                            bb.Parent = child
                        end
                    end
                end
                cons["serveresp"] = workspace.ChildAdded:Connect(function(child)
                    if child.Name == "PlayerCharacterLocationDetector" then
                        local trans = Options.PCLDTransparency.Value
                        child.Transparency = trans
                        if child:IsA("BasePart") then 
                            child.Color = Options.ServerESP_FillColor.Value
                            child.Material = Enum.Material.Neon
                        end
                        -- Outline für neue PCLDs
                        local outline = Instance.new("SelectionBox")
                        outline.Name = "PCLD_Outline"
                        outline.Color3 = Options.ServerESP_OutlineColor.Value
                        outline.LineThickness = 0.05
                        outline.Adornee = child
                        outline.Parent = child
                        local bb = Instance.new("BillboardGui")
                        bb.Name = "PCLD_Billboard"
                        bb.Size = UDim2.new(0, 60, 0, 20)
                        bb.AlwaysOnTop = true
                        bb.StudsOffset = Vector3.new(0, 2.5, 0)
                        bb.Parent = child
                    end
                end)
            else
                if cons["serveresp"] then
                    cons["serveresp"]:Disconnect()
                    cons["serveresp"] = nil
                end
                for _, child in pairs(workspace:GetChildren()) do
                    if child.Name == "PlayerCharacterLocationDetector" then
                        child.Transparency = 1
                        if child:FindFirstChild("PCLD_Outline") then
                            child.PCLD_Outline:Destroy()
                        end
                        if child:FindFirstChild("PCLD_Billboard") then
                            child.PCLD_Billboard:Destroy()
                        end
                    end
                end
            end
        end
    })
    serverESPToggle:AddColorPicker("ServerESP_FillColor", { Default = Color3.fromRGB(255, 255, 255), Title = "Fill" })
    serverESPToggle:AddColorPicker("ServerESP_OutlineColor", { Default = Color3.fromRGB(0, 0, 0), Title = "Outline" })
    
    

    -- 3. NAME ESP (weiß/schwarz Toggle mit 2 ColorPickern)
    local nameESPToggle = leftBox:AddToggle("NameESP", {
        Text = "Name ESP",
        Default = false,
        Callback = function(v)
            if v then
                local function applyNameTag(char, player)
                    task.wait(0.1)
                    local head = char:WaitForChild("Head", 5)
                    if head and not head:FindFirstChild("NameESP_Tag") then
                        local bbgi = Instance.new("BillboardGui")
                        bbgi.Name = "NameESP_Tag"
                        bbgi.Size = UDim2.new(0, 200, 0, 50)
                        bbgi.AlwaysOnTop = true
                        bbgi.ExtentsOffset = Vector3.new(0, 2.5, 0)
                        
                        local tl = Instance.new("TextLabel", bbgi)
                        tl.Size = UDim2.new(1, 0, 1, 0)
                        tl.BackgroundTransparency = 1
                        tl.TextColor3 = Options.NameESP_TextColor.Value
                        tl.TextStrokeTransparency = 0
                        tl.TextStrokeColor3 = Options.NameESP_OutlineColor.Value
                        tl.TextSize = 14
                        tl.Font = Enum.Font.SourceSansBold

                        task.spawn(function()
                            while char and head and bbgi and Toggles.NameESP.Value and task.wait(0.2) do
                                local myChar = plr.Character
                                if myChar and myChar:FindFirstChild("HumanoidRootPart") and char:FindFirstChild("HumanoidRootPart") then
                                    local dist = math.round((myChar.HumanoidRootPart.Position - char.HumanoidRootPart.Position).Magnitude)
                                    tl.Text = player.Name .. " [" .. dist .. "m]"
                                end
                            end
                        end)
                        bbgi.Parent = head
                    end
                end

                for _, p in Players:GetPlayers() do
                    if p ~= plr and p.Character then applyNameTag(p.Character, p) end
                    cons["nameesp_added_" .. p.Name] = p.CharacterAdded:Connect(function(c) applyNameTag(c, p) end)
                end
                cons["nameesp_p_added"] = Players.PlayerAdded:Connect(function(p)
                    cons["nameesp_added_" .. p.Name] = p.CharacterAdded:Connect(function(c) applyNameTag(c, p) end)
                end)
            else
                if cons["nameesp_p_added"] then cons["nameesp_p_added"]:Disconnect() end
                for _, p in Players:GetPlayers() do
                    if cons["nameesp_added_" .. p.Name] then cons["nameesp_added_" .. p.Name]:Disconnect() end
                    if p.Character and p.Character:FindFirstChild("Head") and p.Character.Head:FindFirstChild("NameESP_Tag") then
                        p.Character.Head.NameESP_Tag:Destroy()
                    end
                end
            end
        end
    })
    nameESPToggle:AddColorPicker("NameESP_TextColor", { Default = Color3.fromRGB(255, 255, 255), Title = "Text" })
    nameESPToggle:AddColorPicker("NameESP_OutlineColor", { Default = Color3.fromRGB(0, 0, 0), Title = "Outline" })

    -- 4. STICKY ESP (grün/schwarz Toggle mit 2 ColorPickern)
    local stickyESPToggle = leftBox:AddToggle("StickyESP", {
        Text = "Sticky ESP",
        Default = false,
        Callback = function(v)
            if v then
                for _, pl in Players:GetPlayers() do
                    if pl ~= plr then
                        local spawnFolder = workspace:FindFirstChild(pl.Name .. "SpawnedInToys")
                        if spawnFolder then
                            for _, toy in spawnFolder:GetChildren() do
                                if toy:FindFirstChild("StickyPart") then
                                    local high = toy:FindFirstChildOfClass("Highlight") or Instance.new("Highlight", toy)
                                    high.Name = "StickyESP_Highlight"
                                    high.Adornee = toy
                                    high.FillColor = Options.StickyESP_FillColor.Value
                                    high.OutlineColor = Options.StickyESP_OutlineColor.Value
                                    high.FillTransparency = 0.3
                                    high.OutlineTransparency = 0
                                    high.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
                                end
                            end
                        end
                        
                        if spawnFolder then
                            cons["stickyesp_" .. pl.Name] = spawnFolder.ChildAdded:Connect(function(v)
                                task.wait(0.4)
                                if v:FindFirstChild("StickyPart") then
                                    local high = Instance.new("Highlight", v)
                                    high.Name = "StickyESP_Highlight"
                                    high.Adornee = v
                                    high.FillColor = Options.StickyESP_FillColor.Value
                                    high.OutlineColor = Options.StickyESP_OutlineColor.Value
                                    high.FillTransparency = 0.3
                                    high.OutlineTransparency = 0
                                    high.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
                                end
                            end)
                        end
                    end
                end
            else
                for _, pl in Players:GetPlayers() do
                    if pl ~= plr then
                        if cons["stickyesp_" .. pl.Name] then
                            cons["stickyesp_" .. pl.Name]:Disconnect()
                            cons["stickyesp_" .. pl.Name] = nil
                        end
                        local spawnFolder = workspace:FindFirstChild(pl.Name .. "SpawnedInToys")
                        if spawnFolder then
                            for _, toy in spawnFolder:GetChildren() do
                                local high = toy:FindFirstChild("StickyESP_Highlight")
                                if high then high:Destroy() end
                            end
                        end
                    end
                end
            end
        end
    })
    stickyESPToggle:AddColorPicker("StickyESP_FillColor", { Default = Color3.fromRGB(0, 255, 0), Title = "Fill" })
    stickyESPToggle:AddColorPicker("StickyESP_OutlineColor", { Default = Color3.fromRGB(0, 0, 0), Title = "Outline" })

    leftBox:AddSlider("PCLDTransparency", {
        Text = "PCLD Transparency",
        Default = 0.3,
        Min = 0,
        Max = 1,
        Rounding = 2,
        Callback = function(v)
            if Toggles.ServerESP.Value then
                for _, child in pairs(workspace:GetChildren()) do
                    if child.Name == "PlayerCharacterLocationDetector" then
                        child.Transparency = v
                    end
                end
            end
        end
    })

    --// =========================
    --// GAME TWEAKS (unter ESPs)
    --// =========================
    
    leftBox:AddLabel("Game Tweaks", true)
    
    -- Line Texture Dropdown - MEHR UND BESSERE TEXTURES
    -- PERFORMANCE FRIENDLY CUSTOM GRAB LINES - BIG STYLE PACK
local RunService = game:GetService("RunService")

cons = cons or {}

local lineState = {
    Enabled = false,
    Preset = "Aura",
    Time = 0,
    Tick = 0
}

local activeLines = {}

local function rgb(r, g, b)
    return Color3.fromRGB(r, g, b)
end

local linePresets = {
    ["Aura"] = {
        Texture = "rbxassetid://258128463",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.2,
        TextureSpeed = 1.2,
        Width0 = 0.32,
        Width1 = 0.14,
        LightEmission = 0.75,
        LightInfluence = 0,
        Transparency = {0.18, 0.12, 0.62},
        Colors = {rgb(160, 225, 255), rgb(130, 110, 255), rgb(255, 255, 255)},
        Animation = "pulse"
    },

    ["Angel Aura"] = {
        Texture = "rbxassetid://258128475",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.6,
        TextureSpeed = 0.85,
        Width0 = 0.34,
        Width1 = 0.18,
        LightEmission = 0.9,
        LightInfluence = 0,
        Transparency = {0.22, 0.08, 0.68},
        Colors = {rgb(255, 255, 230), rgb(180, 235, 255), rgb(255, 255, 255)},
        Animation = "breathe"
    },

    ["Dark Aura"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.4,
        TextureSpeed = 1.7,
        Width0 = 0.38,
        Width1 = 0.16,
        LightEmission = 0.55,
        LightInfluence = 0,
        Transparency = {0.16, 0.18, 0.72},
        Colors = {rgb(75, 0, 125), rgb(20, 0, 45), rgb(185, 80, 255)},
        Animation = "darkpulse"
    },

    ["Electric"] = {
        Texture = "rbxassetid://243660364",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.6,
        TextureSpeed = 5,
        Width0 = 0.3,
        Width1 = 0.11,
        LightEmission = 0.9,
        LightInfluence = 0,
        Transparency = {0.04, 0.16, 0.7},
        Colors = {rgb(90, 220, 255), rgb(255, 255, 255), rgb(80, 120, 255)},
        Animation = "electric"
    },

    ["Lightning"] = {
        Texture = "rbxassetid://243660373",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.1,
        TextureSpeed = 7.5,
        Width0 = 0.4,
        Width1 = 0.09,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.02, 0.2, 0.82},
        Colors = {rgb(180, 240, 255), rgb(255, 255, 255), rgb(70, 140, 255)},
        Animation = "flicker"
    },

    ["Plasma"] = {
        Texture = "rbxassetid://258128493",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.45,
        TextureSpeed = 3.4,
        Width0 = 0.42,
        Width1 = 0.18,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.05, 0.08, 0.62},
        Colors = {rgb(255, 70, 220), rgb(80, 230, 255), rgb(255, 255, 255)},
        Animation = "plasma"
    },

    ["Fire"] = {
        Texture = "rbxassetid://243660361",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.5,
        TextureSpeed = 2.6,
        Width0 = 0.36,
        Width1 = 0.12,
        LightEmission = 0.85,
        LightInfluence = 0,
        Transparency = {0.12, 0.28, 0.78},
        Colors = {rgb(255, 60, 8), rgb(255, 180, 35), rgb(100, 20, 5)},
        Animation = "fire"
    },

    ["Blue Fire"] = {
        Texture = "rbxassetid://243660361",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.2,
        TextureSpeed = 3,
        Width0 = 0.36,
        Width1 = 0.13,
        LightEmission = 0.95,
        LightInfluence = 0,
        Transparency = {0.1, 0.24, 0.78},
        Colors = {rgb(30, 150, 255), rgb(180, 245, 255), rgb(10, 20, 80)},
        Animation = "fire"
    },

    ["Poison"] = {
        Texture = "rbxassetid://258128499",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.8,
        TextureSpeed = 1.4,
        Width0 = 0.34,
        Width1 = 0.16,
        LightEmission = 0.65,
        LightInfluence = 0.05,
        Transparency = {0.16, 0.18, 0.7},
        Colors = {rgb(90, 255, 95), rgb(20, 135, 45), rgb(190, 255, 80)},
        Animation = "toxic"
    },

    ["Slime"] = {
        Texture = "rbxassetid://258128451",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 3.1,
        TextureSpeed = 0.75,
        Width0 = 0.42,
        Width1 = 0.24,
        LightEmission = 0.45,
        LightInfluence = 0.1,
        Transparency = {0.18, 0.12, 0.6},
        Colors = {rgb(120, 255, 80), rgb(30, 180, 70), rgb(210, 255, 120)},
        Animation = "goo"
    },

    ["Ghost"] = {
        Texture = "rbxassetid://258128463",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 3,
        TextureSpeed = 0.65,
        Width0 = 0.28,
        Width1 = 0.16,
        LightEmission = 0.45,
        LightInfluence = 0.05,
        Transparency = {0.5, 0.32, 0.82},
        Colors = {rgb(220, 255, 245), rgb(145, 210, 255), rgb(255, 255, 255)},
        Animation = "ghost"
    },

    ["Ice"] = {
        Texture = "rbxassetid://258128475",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.8,
        TextureSpeed = 0.9,
        Width0 = 0.3,
        Width1 = 0.12,
        LightEmission = 0.72,
        LightInfluence = 0,
        Transparency = {0.2, 0.1, 0.66},
        Colors = {rgb(185, 245, 255), rgb(85, 170, 255), rgb(255, 255, 255)},
        Animation = "ice"
    },

    ["Crystal"] = {
        Texture = "rbxassetid://258128487",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.9,
        TextureSpeed = 1.1,
        Width0 = 0.26,
        Width1 = 0.1,
        LightEmission = 0.9,
        LightInfluence = 0,
        Transparency = {0.1, 0.08, 0.65},
        Colors = {rgb(170, 220, 255), rgb(255, 255, 255), rgb(130, 120, 255)},
        Animation = "sparkle"
    },

    ["Gold"] = {
        Texture = "rbxassetid://258128487",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.1,
        TextureSpeed = 1.8,
        Width0 = 0.3,
        Width1 = 0.12,
        LightEmission = 0.88,
        LightInfluence = 0,
        Transparency = {0.06, 0.08, 0.62},
        Colors = {rgb(255, 210, 75), rgb(255, 255, 210), rgb(190, 125, 20)},
        Animation = "shine"
    },

    ["Stars"] = {
        Texture = "rbxassetid://258128451",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2,
        TextureSpeed = 2.3,
        Width0 = 0.26,
        Width1 = 0.1,
        LightEmission = 0.95,
        LightInfluence = 0,
        Transparency = {0.04, 0.08, 0.7},
        Colors = {rgb(255, 255, 180), rgb(255, 220, 90), rgb(255, 255, 255)},
        Animation = "sparkle"
    },

    ["Hearts"] = {
        Texture = "rbxassetid://258128487",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.5,
        TextureSpeed = 1.25,
        Width0 = 0.34,
        Width1 = 0.14,
        LightEmission = 0.8,
        LightInfluence = 0,
        Transparency = {0.1, 0.1, 0.7},
        Colors = {rgb(255, 80, 150), rgb(255, 180, 220), rgb(255, 255, 255)},
        Animation = "breathe"
    },

    ["Candy"] = {
        Texture = "rbxassetid://258128481",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.7,
        TextureSpeed = 1.8,
        Width0 = 0.36,
        Width1 = 0.2,
        LightEmission = 0.75,
        LightInfluence = 0,
        Transparency = {0.05, 0.1, 0.58},
        Colors = {rgb(255, 80, 130), rgb(255, 255, 255), rgb(80, 220, 255)},
        Animation = "scrollpulse"
    },

    ["Rainbow"] = {
        Texture = "rbxassetid://258128493",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.9,
        TextureSpeed = 1.6,
        Width0 = 0.34,
        Width1 = 0.28,
        LightEmission = 0.9,
        LightInfluence = 0,
        Transparency = {0.04, 0.08, 0.25},
        Colors = {rgb(0, 255, 255), rgb(255, 0, 255), rgb(255, 255, 0)},
        Animation = "rainbow"
    },

    ["Cyber"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 0.95,
        TextureSpeed = 5.5,
        Width0 = 0.32,
        Width1 = 0.12,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.04, 0.18, 0.76},
        Colors = {rgb(0, 255, 220), rgb(255, 40, 160), rgb(255, 255, 255)},
        Animation = "glitch"
    },

    ["Matrix"] = {
        Texture = "rbxassetid://258128499",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.2,
        TextureSpeed = 4,
        Width0 = 0.3,
        Width1 = 0.1,
        LightEmission = 0.85,
        LightInfluence = 0,
        Transparency = {0.05, 0.16, 0.72},
        Colors = {rgb(30, 255, 80), rgb(150, 255, 170), rgb(0, 80, 20)},
        Animation = "digital"
    },

    ["Void"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.7,
        TextureSpeed = -1.1,
        Width0 = 0.42,
        Width1 = 0.18,
        LightEmission = 0.45,
        LightInfluence = 0,
        Transparency = {0.18, 0.22, 0.8},
        Colors = {rgb(35, 0, 65), rgb(0, 0, 0), rgb(130, 50, 220)},
        Animation = "void"
    },

    ["Blood"] = {
        Texture = "rbxassetid://258128469",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.9,
        TextureSpeed = 0.8,
        Width0 = 0.36,
        Width1 = 0.16,
        LightEmission = 0.35,
        LightInfluence = 0.1,
        Transparency = {0.08, 0.18, 0.72},
        Colors = {rgb(190, 15, 25), rgb(80, 0, 5), rgb(255, 55, 55)},
        Animation = "drip"
    },

    -- ========== NEUE STYLES ==========
    ["Chain"] = {
        Texture = "rbxassetid://258128469",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.5,
        TextureSpeed = 2.0,
        Width0 = 0.28,
        Width1 = 0.28,
        LightEmission = 0.6,
        LightInfluence = 0.15,
        Transparency = {0.1, 0.05, 0.5},
        Colors = {rgb(160, 160, 160), rgb(80, 80, 80), rgb(200, 200, 200)},
        Animation = "chain"
    },

    ["Rope"] = {
        Texture = "rbxassetid://258128481",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 3.5,
        TextureSpeed = 0.5,
        Width0 = 0.25,
        Width1 = 0.25,
        LightEmission = 0.2,
        LightInfluence = 0.3,
        Transparency = {0.15, 0.1, 0.55},
        Colors = {rgb(139, 90, 43), rgb(101, 67, 33), rgb(180, 140, 100)},
        Animation = "rope"
    },

    ["Neon Wire"] = {
        Texture = "rbxassetid://243660364",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 0.8,
        TextureSpeed = 8.0,
        Width0 = 0.15,
        Width1 = 0.15,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.02, 0.02, 0.3},
        Colors = {rgb(255, 0, 128), rgb(0, 255, 128), rgb(255, 255, 0)},
        Animation = "neonwire"
    },

    ["Laser Beam"] = {
        Texture = "rbxassetid://243660373",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 0.5,
        TextureSpeed = 10,
        Width0 = 0.12,
        Width1 = 0.12,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.0, 0.0, 0.15},
        Colors = {rgb(255, 0, 0), rgb(255, 100, 0), rgb(255, 50, 50)},
        Animation = "laser"
    },

    ["Energy Ribbon"] = {
        Texture = "rbxassetid://258128493",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.0,
        TextureSpeed = 2.5,
        Width0 = 0.5,
        Width1 = 0.08,
        LightEmission = 0.95,
        LightInfluence = 0,
        Transparency = {0.08, 0.04, 0.45},
        Colors = {rgb(255, 100, 255), rgb(100, 255, 255), rgb(255, 255, 255)},
        Animation = "ribbon"
    },

    ["Molten"] = {
        Texture = "rbxassetid://243660361",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 3.5,
        TextureSpeed = 1.5,
        Width0 = 0.45,
        Width1 = 0.2,
        LightEmission = 0.7,
        LightInfluence = 0.05,
        Transparency = {0.2, 0.15, 0.6},
        Colors = {rgb(255, 80, 0), rgb(255, 200, 0), rgb(80, 20, 0)},
        Animation = "molten"
    },

    ["Toxic Waste"] = {
        Texture = "rbxassetid://258128499",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 4.0,
        TextureSpeed = 0.6,
        Width0 = 0.4,
        Width1 = 0.22,
        LightEmission = 0.5,
        LightInfluence = 0.1,
        Transparency = {0.25, 0.2, 0.65},
        Colors = {rgb(50, 255, 50), rgb(20, 150, 20), rgb(150, 255, 100)},
        Animation = "toxicwaste"
    },

    ["Shadow Tendril"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.0,
        TextureSpeed = -2.0,
        Width0 = 0.35,
        Width1 = 0.05,
        LightEmission = 0.3,
        LightInfluence = 0.2,
        Transparency = {0.3, 0.25, 0.85},
        Colors = {rgb(20, 0, 40), rgb(0, 0, 0), rgb(60, 20, 80)},
        Animation = "tendril"
    },

    ["Holy Light"] = {
        Texture = "rbxassetid://258128463",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.5,
        TextureSpeed = 3.0,
        Width0 = 0.2,
        Width1 = 0.35,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.05, 0.02, 0.4},
        Colors = {rgb(255, 255, 200), rgb(255, 220, 100), rgb(255, 255, 255)},
        Animation = "holy"
    },

    ["Frost Bite"] = {
        Texture = "rbxassetid://258128475",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.8,
        TextureSpeed = 1.5,
        Width0 = 0.22,
        Width1 = 0.08,
        LightEmission = 0.8,
        LightInfluence = 0,
        Transparency = {0.12, 0.08, 0.5},
        Colors = {rgb(200, 240, 255), rgb(100, 200, 255), rgb(255, 255, 255)},
        Animation = "frost"
    },

    ["Diamond Edge"] = {
        Texture = "rbxassetid://258128487",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.0,
        TextureSpeed = 4.0,
        Width0 = 0.18,
        Width1 = 0.06,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.03, 0.02, 0.35},
        Colors = {rgb(200, 230, 255), rgb(255, 255, 255), rgb(150, 180, 255)},
        Animation = "diamond"
    },

    ["Royal Gold"] = {
        Texture = "rbxassetid://258128487",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.5,
        TextureSpeed = 1.0,
        Width0 = 0.32,
        Width1 = 0.14,
        LightEmission = 0.85,
        LightInfluence = 0,
        Transparency = {0.08, 0.06, 0.5},
        Colors = {rgb(255, 215, 0), rgb(255, 255, 150), rgb(184, 134, 11)},
        Animation = "royal"
    },

    ["Galaxy"] = {
        Texture = "rbxassetid://258128451",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.2,
        TextureSpeed = 0.4,
        Width0 = 0.38,
        Width1 = 0.16,
        LightEmission = 0.7,
        LightInfluence = 0.05,
        Transparency = {0.15, 0.1, 0.6},
        Colors = {rgb(138, 43, 226), rgb(75, 0, 130), rgb(255, 255, 255)},
        Animation = "galaxy"
    },

    ["Love Struck"] = {
        Texture = "rbxassetid://258128487",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.6,
        TextureSpeed = 2.0,
        Width0 = 0.3,
        Width1 = 0.12,
        LightEmission = 0.9,
        LightInfluence = 0,
        Transparency = {0.08, 0.05, 0.45},
        Colors = {rgb(255, 105, 180), rgb(255, 182, 193), rgb(255, 255, 255)},
        Animation = "love"
    },

    ["Sweet Tooth"] = {
        Texture = "rbxassetid://258128481",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.0,
        TextureSpeed = 2.2,
        Width0 = 0.34,
        Width1 = 0.18,
        LightEmission = 0.8,
        LightInfluence = 0,
        Transparency = {0.06, 0.04, 0.5},
        Colors = {rgb(255, 105, 180), rgb(135, 206, 250), rgb(255, 255, 255)},
        Animation = "sweet"
    },

    ["Prismatic"] = {
        Texture = "rbxassetid://258128493",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.5,
        TextureSpeed = 3.5,
        Width0 = 0.3,
        Width1 = 0.3,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.04, 0.04, 0.3},
        Colors = {rgb(255, 0, 0), rgb(0, 255, 0), rgb(0, 0, 255)},
        Animation = "prismatic"
    },

    ["Hacker"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 0.7,
        TextureSpeed = 6.0,
        Width0 = 0.2,
        Width1 = 0.08,
        LightEmission = 0.9,
        LightInfluence = 0,
        Transparency = {0.03, 0.12, 0.7},
        Colors = {rgb(0, 255, 0), rgb(0, 200, 0), rgb(50, 255, 50)},
        Animation = "hacker"
    },

    ["Abyss"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 3.0,
        TextureSpeed = -0.8,
        Width0 = 0.4,
        Width1 = 0.15,
        LightEmission = 0.25,
        LightInfluence = 0.25,
        Transparency = {0.35, 0.3, 0.9},
        Colors = {rgb(10, 0, 30), rgb(0, 0, 0), rgb(40, 10, 60)},
        Animation = "abyss"
    },

    ["Crimson"] = {
        Texture = "rbxassetid://258128469",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.5,
        TextureSpeed = 1.2,
        Width0 = 0.33,
        Width1 = 0.13,
        LightEmission = 0.5,
        LightInfluence = 0.08,
        Transparency = {0.12, 0.15, 0.65},
        Colors = {rgb(220, 20, 60), rgb(139, 0, 0), rgb(255, 69, 0)},
        Animation = "crimson"
    },

    ["Neon Pulse"] = {
        Texture = "rbxassetid://243660364",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.0,
        TextureSpeed = 12.0,
        Width0 = 0.16,
        Width1 = 0.16,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.01, 0.01, 0.2},
        Colors = {rgb(0, 255, 255), rgb(255, 0, 255), rgb(255, 255, 0)},
        Animation = "neonpulse"
    },

    ["Static"] = {
        Texture = "rbxassetid://243660373",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 0.6,
        TextureSpeed = 15.0,
        Width0 = 0.2,
        Width1 = 0.2,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.02, 0.08, 0.4},
        Colors = {rgb(200, 200, 255), rgb(255, 255, 255), rgb(150, 150, 255)},
        Animation = "static"
    },

    ["Solar Flare"] = {
        Texture = "rbxassetid://243660361",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 1.8,
        TextureSpeed = 4.5,
        Width0 = 0.5,
        Width1 = 0.1,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.05, 0.1, 0.5},
        Colors = {rgb(255, 140, 0), rgb(255, 255, 0), rgb(255, 69, 0)},
        Animation = "solar"
    },

    ["Arctic Wind"] = {
        Texture = "rbxassetid://258128475",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 3.5,
        TextureSpeed = 0.3,
        Width0 = 0.2,
        Width1 = 0.2,
        LightEmission = 0.6,
        LightInfluence = 0.1,
        Transparency = {0.3, 0.2, 0.7},
        Colors = {rgb(176, 224, 230), rgb(173, 216, 230), rgb(255, 255, 255)},
        Animation = "arctic"
    },

    ["Emerald"] = {
        Texture = "rbxassetid://258128493",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.3,
        TextureSpeed = 1.3,
        Width0 = 0.28,
        Width1 = 0.12,
        LightEmission = 0.85,
        LightInfluence = 0,
        Transparency = {0.08, 0.06, 0.55},
        Colors = {rgb(0, 255, 127), rgb(50, 205, 50), rgb(144, 238, 144)},
        Animation = "emerald"
    },

    ["Ruby"] = {
        Texture = "rbxassetid://258128469",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.0,
        TextureSpeed = 1.6,
        Width0 = 0.3,
        Width1 = 0.1,
        LightEmission = 0.8,
        LightInfluence = 0,
        Transparency = {0.1, 0.08, 0.5},
        Colors = {rgb(255, 0, 0), rgb(220, 20, 60), rgb(255, 99, 71)},
        Animation = "ruby"
    },

    ["Sapphire"] = {
        Texture = "rbxassetid://258128475",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.1,
        TextureSpeed = 1.4,
        Width0 = 0.27,
        Width1 = 0.11,
        LightEmission = 0.88,
        LightInfluence = 0,
        Transparency = {0.07, 0.05, 0.48},
        Colors = {rgb(0, 0, 255), rgb(65, 105, 225), rgb(135, 206, 250)},
        Animation = "sapphire"
    },

    ["Amethyst"] = {
        Texture = "rbxassetid://258128493",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.4,
        TextureSpeed = 1.0,
        Width0 = 0.32,
        Width1 = 0.14,
        LightEmission = 0.82,
        LightInfluence = 0,
        Transparency = {0.1, 0.08, 0.52},
        Colors = {rgb(153, 50, 204), rgb(138, 43, 226), rgb(216, 191, 216)},
        Animation = "amethyst"
    },

    ["Obsidian"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.8,
        TextureSpeed = 0.5,
        Width0 = 0.35,
        Width1 = 0.15,
        LightEmission = 0.4,
        LightInfluence = 0.2,
        Transparency = {0.25, 0.2, 0.75},
        Colors = {rgb(20, 20, 20), rgb(0, 0, 0), rgb(50, 50, 50)},
        Animation = "obsidian"
    },

    ["Pearl"] = {
        Texture = "rbxassetid://258128463",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.5,
        TextureSpeed = 0.7,
        Width0 = 0.24,
        Width1 = 0.1,
        LightEmission = 0.75,
        LightInfluence = 0.05,
        Transparency = {0.15, 0.1, 0.55},
        Colors = {rgb(255, 255, 240), rgb(245, 245, 220), rgb(255, 255, 255)},
        Animation = "pearl"
    },

    ["Coral"] = {
        Texture = "rbxassetid://258128481",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.2,
        TextureSpeed = 1.1,
        Width0 = 0.3,
        Width1 = 0.14,
        LightEmission = 0.7,
        LightInfluence = 0.05,
        Transparency = {0.12, 0.1, 0.58},
        Colors = {rgb(255, 127, 80), rgb(255, 160, 122), rgb(255, 218, 185)},
        Animation = "coral"
    },

    ["Mint"] = {
        Texture = "rbxassetid://258128499",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.6,
        TextureSpeed = 0.9,
        Width0 = 0.26,
        Width1 = 0.12,
        LightEmission = 0.65,
        LightInfluence = 0.05,
        Transparency = {0.14, 0.1, 0.6},
        Colors = {rgb(152, 255, 152), rgb(144, 238, 144), rgb(0, 255, 127)},
        Animation = "mint"
    },

    ["Lavender"] = {
        Texture = "rbxassetid://258128493",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.3,
        TextureSpeed = 0.8,
        Width0 = 0.28,
        Width1 = 0.13,
        LightEmission = 0.7,
        LightInfluence = 0.05,
        Transparency = {0.16, 0.12, 0.62},
        Colors = {rgb(230, 230, 250), rgb(221, 160, 221), rgb(255, 240, 245)},
        Animation = "lavender"
    },

    ["Sunset"] = {
        Texture = "rbxassetid://243660361",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.4,
        TextureSpeed = 1.0,
        Width0 = 0.34,
        Width1 = 0.16,
        LightEmission = 0.8,
        LightInfluence = 0,
        Transparency = {0.1, 0.08, 0.55},
        Colors = {rgb(255, 94, 77), rgb(255, 154, 0), rgb(255, 206, 84)},
        Animation = "sunset"
    },

    ["Ocean"] = {
        Texture = "rbxassetid://258128475",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 3.0,
        TextureSpeed = 0.6,
        Width0 = 0.3,
        Width1 = 0.14,
        LightEmission = 0.7,
        LightInfluence = 0.05,
        Transparency = {0.18, 0.12, 0.6},
        Colors = {rgb(0, 105, 148), rgb(0, 149, 182), rgb(64, 224, 208)},
        Animation = "ocean"
    },

    ["Volcanic"] = {
        Texture = "rbxassetid://243660361",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.0,
        TextureSpeed = 3.0,
        Width0 = 0.42,
        Width1 = 0.18,
        LightEmission = 0.75,
        LightInfluence = 0.05,
        Transparency = {0.15, 0.12, 0.65},
        Colors = {rgb(255, 69, 0), rgb(139, 0, 0), rgb(0, 0, 0)},
        Animation = "volcanic"
    },

    ["Thunder"] = {
        Texture = "rbxassetid://243660373",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 0.9,
        TextureSpeed = 9.0,
        Width0 = 0.38,
        Width1 = 0.08,
        LightEmission = 1,
        LightInfluence = 0,
        Transparency = {0.03, 0.15, 0.75},
        Colors = {rgb(255, 255, 0), rgb(192, 192, 192), rgb(255, 255, 255)},
        Animation = "thunder"
    },

    ["Spirit"] = {
        Texture = "rbxassetid://258128463",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.8,
        TextureSpeed = 0.5,
        Width0 = 0.25,
        Width1 = 0.15,
        LightEmission = 0.55,
        LightInfluence = 0.1,
        Transparency = {0.35, 0.25, 0.8},
        Colors = {rgb(200, 200, 255), rgb(180, 180, 255), rgb(255, 255, 255)},
        Animation = "spirit"
    },

    ["Venom"] = {
        Texture = "rbxassetid://258128499",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.5,
        TextureSpeed = 1.8,
        Width0 = 0.33,
        Width1 = 0.11,
        LightEmission = 0.6,
        LightInfluence = 0.05,
        Transparency = {0.14, 0.16, 0.68},
        Colors = {rgb(128, 0, 128), rgb(75, 0, 130), rgb(0, 255, 0)},
        Animation = "venom"
    },

    ["Phoenix"] = {
        Texture = "rbxassetid://243660361",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.2,
        TextureSpeed = 2.8,
        Width0 = 0.4,
        Width1 = 0.12,
        LightEmission = 0.9,
        LightInfluence = 0,
        Transparency = {0.08, 0.1, 0.6},
        Colors = {rgb(255, 69, 0), rgb(255, 140, 0), rgb(255, 215, 0)},
        Animation = "phoenix"
    },

    ["Frost Dragon"] = {
        Texture = "rbxassetid://258128475",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.6,
        TextureSpeed = 1.2,
        Width0 = 0.36,
        Width1 = 0.14,
        LightEmission = 0.78,
        LightInfluence = 0,
        Transparency = {0.12, 0.08, 0.58},
        Colors = {rgb(0, 191, 255), rgb(135, 206, 250), rgb(255, 255, 255)},
        Animation = "frostdragon"
    },

    ["Shadow Dragon"] = {
        Texture = "rbxassetid://258128505",
        TextureMode = Enum.TextureMode.Wrap,
        TextureLength = 2.4,
        TextureSpeed = -1.5,
        Width0 = 0.4,
        Width1 = 0.1,
        LightEmission = 0.35,
        LightInfluence = 0.15,
        Transparency = {0.3, 0.25, 0.85},
        Colors = {rgb(25, 25, 25), rgb(0, 0, 0), rgb(75, 0, 130)},
        Animation = "shadowdragon"
    }
}

local lineValues = {
    "Aura", "Angel Aura", "Dark Aura", "Electric", "Lightning", "Plasma",
    "Fire", "Blue Fire", "Poison", "Slime", "Ghost", "Ice", "Crystal",
    "Gold", "Stars", "Hearts", "Candy", "Rainbow", "Cyber", "Matrix",
    "Void", "Blood", "Chain", "Rope", "Neon Wire", "Laser Beam",
    "Energy Ribbon", "Molten", "Toxic Waste", "Shadow Tendril", "Holy Light",
    "Frost Bite", "Diamond Edge", "Royal Gold", "Galaxy", "Love Struck",
    "Sweet Tooth", "Prismatic", "Hacker", "Abyss", "Crimson", "Neon Pulse",
    "Static", "Solar Flare", "Arctic Wind", "Emerald", "Ruby", "Sapphire",
    "Amethyst", "Obsidian", "Pearl", "Coral", "Mint", "Lavender", "Sunset",
    "Ocean", "Volcanic", "Thunder", "Spirit", "Venom", "Phoenix",
    "Frost Dragon", "Shadow Dragon"
}

local function isGrabBeam(obj)
    return obj and obj:IsA("Beam") and (obj.Name == "GrabBeam" or obj.Name == "GrabLine")
end

local function colorSeq(a, b, c)
    return ColorSequence.new({
        ColorSequenceKeypoint.new(0, a),
        ColorSequenceKeypoint.new(0.5, b),
        ColorSequenceKeypoint.new(1, c)
    })
end

local function transSeq(v, boost)
    boost = boost or 0
    return NumberSequence.new({
        NumberSequenceKeypoint.new(0, math.clamp(v[1] + boost, 0, 1)),
        NumberSequenceKeypoint.new(0.5, math.clamp(v[2] + boost, 0, 1)),
        NumberSequenceKeypoint.new(1, math.clamp(v[3] + boost, 0, 1))
    })
end

local function cacheBeam(beam)
    if isGrabBeam(beam) then
        activeLines[beam] = true
    end
end

local function cleanCache()
    for beam in pairs(activeLines) do
        if not beam.Parent then
            activeLines[beam] = nil
        end
    end
end

local function applyLinePreset(beam)
    if not isGrabBeam(beam) then return end

    local preset = linePresets[lineState.Preset] or linePresets.Aura

    beam.Texture = preset.Texture
    beam.TextureMode = preset.TextureMode
    beam.TextureLength = preset.TextureLength
    beam.TextureSpeed = preset.TextureSpeed
    beam.Width0 = preset.Width0
    beam.Width1 = preset.Width1
    beam.LightEmission = preset.LightEmission
    beam.LightInfluence = preset.LightInfluence
    beam.Transparency = transSeq(preset.Transparency)
    beam.Color = colorSeq(preset.Colors[1], preset.Colors[2], preset.Colors[3])

    beam:SetAttribute("PexusBaseWidth0", preset.Width0)
    beam:SetAttribute("PexusBaseWidth1", preset.Width1)
    beam:SetAttribute("PexusTextureLength", preset.TextureLength)
    beam:SetAttribute("PexusLightEmission", preset.LightEmission)

    cacheBeam(beam)
end

local function applyAllLines()
    table.clear(activeLines)

    for _, d in ipairs(workspace:GetDescendants()) do
        if isGrabBeam(d) then
            applyLinePreset(d)
        end
    end
end

local function hsv(offset, sat, val)
    return Color3.fromHSV((lineState.Time * 0.08 + offset) % 1, sat or 1, val or 1)
end

local function setWidths(beam, preset, mult0, mult1)
    local base0 = beam:GetAttribute("PexusBaseWidth0") or preset.Width0
    local base1 = beam:GetAttribute("PexusBaseWidth1") or preset.Width1

    beam.Width0 = base0 * (mult0 or 1)
    beam.Width1 = base1 * (mult1 or mult0 or 1)
end

local function animateBeam(beam, preset)
    local t = lineState.Time
    local anim = preset.Animation

    if anim == "pulse" then
        local p = 1 + math.sin(t * 3.5) * 0.16
        setWidths(beam, preset, p)

    elseif anim == "breathe" then
        local p = 1 + math.sin(t * 2) * 0.12
        setWidths(beam, preset, p)
        beam.Transparency = transSeq(preset.Transparency, (math.sin(t * 2) + 1) * 0.04)

    elseif anim == "darkpulse" then
        local p = 1 + math.sin(t * 4.5) * 0.22
        setWidths(beam, preset, p, 1 + math.cos(t * 3.2) * 0.12)
        beam.LightEmission = preset.LightEmission + (math.sin(t * 5) + 1) * 0.12

    elseif anim == "electric" then
        local p = 0.85 + math.random() * 0.35
        setWidths(beam, preset, p)
        beam.TextureLength = preset.TextureLength + math.random(-8, 8) / 100

    elseif anim == "flicker" then
        local f = math.random() > 0.22 and 1 or 0.45
        setWidths(beam, preset, 0.85 + f * 0.35, 0.75 + f * 0.25)
        beam.LightEmission = math.clamp(preset.LightEmission * f, 0.2, 1)

    elseif anim == "plasma" then
        beam.Color = colorSeq(hsv(0, 0.8, 1), hsv(0.28, 0.9, 1), hsv(0.62, 0.55, 1))
        setWidths(beam, preset, 1 + math.sin(t * 4.8) * 0.14)

    elseif anim == "fire" then
        local p = 1 + math.sin(t * 5) * 0.13
        setWidths(beam, preset, p, 0.85 + math.sin(t * 4) * 0.12)

    elseif anim == "toxic" then
        local p = 1 + math.sin(t * 2.7) * 0.18
        setWidths(beam, preset, p, 0.9 + math.cos(t * 3.1) * 0.12)
        beam.Transparency = transSeq(preset.Transparency, math.random() > 0.9 and 0.1 or 0)

    elseif anim == "goo" then
        local p0 = 1 + math.sin(t * 2.1) * 0.22
        local p1 = 1 + math.cos(t * 2.8) * 0.18
        setWidths(beam, preset, p0, p1)

    elseif anim == "ghost" then
        local fade = 0.12 + (math.sin(t * 1.8) + 1) * 0.12
        beam.Transparency = transSeq(preset.Transparency, fade)

    elseif anim == "ice" then
        local p = 1 + math.sin(t * 1.6) * 0.08
        setWidths(beam, preset, p)
        beam.LightEmission = preset.LightEmission + (math.sin(t * 2.2) + 1) * 0.08

    elseif anim == "sparkle" then
        local pop = math.random() > 0.86 and 1.35 or 1
        setWidths(beam, preset, pop)
        beam.LightEmission = math.random() > 0.86 and 1 or preset.LightEmission

    elseif anim == "shine" then
        local glow = (math.sin(t * 3.5) + 1) * 0.5
        setWidths(beam, preset, 1 + glow * 0.1)
        beam.Color = colorSeq(rgb(255, 190, 55), rgb(255, 255, 230), rgb(205, 130, 20))

    elseif anim == "scrollpulse" then
        setWidths(beam, preset, 1 + math.sin(t * 4) * 0.1)
        beam.TextureLength = preset.TextureLength + math.sin(t * 2.5) * 0.18

    elseif anim == "rainbow" then
        beam.Color = colorSeq(hsv(0), hsv(0.33), hsv(0.66))
        setWidths(beam, preset, 1 + math.sin(t * 2.8) * 0.08)

    elseif anim == "glitch" then
        if math.random() > 0.78 then
            beam.Color = colorSeq(hsv(math.random()), hsv(math.random()), rgb(255, 255, 255))
            beam.TextureLength = math.clamp(preset.TextureLength + math.random(-20, 30) / 100, 0.3, 3)
            setWidths(beam, preset, 0.7 + math.random() * 0.7, 0.7 + math.random() * 0.7)
        end

    elseif anim == "digital" then
        local step = math.floor(t * 8) % 2
        setWidths(beam, preset, step == 0 and 1 or 0.82)
        beam.LightEmission = step == 0 and preset.LightEmission or 0.55

    elseif anim == "void" then
        local p = 1 + math.sin(t * 2.4) * 0.2
        setWidths(beam, preset, p, 1 + math.cos(t * 1.7) * 0.18)
        beam.Transparency = transSeq(preset.Transparency, (math.sin(t * 2.1) + 1) * 0.08)

    elseif anim == "drip" then
        setWidths(beam, preset, 1 + math.sin(t * 1.7) * 0.16, 0.85 + math.sin(t * 3.2) * 0.18)
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 2) * 0.25

    -- ========== NEUE ANIMATIONEN ==========
    elseif anim == "chain" then
        local p = 1 + math.sin(t * 4) * 0.08
        setWidths(beam, preset, p)
        beam.TextureLength = preset.TextureLength + math.sin(t * 3) * 0.2
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 2) * 0.5

    elseif anim == "rope" then
        local twist = math.sin(t * 1.5) * 0.15
        setWidths(beam, preset, 1 + twist, 1 - twist)
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 0.8) * 0.3

    elseif anim == "neonwire" then
        local flicker = math.random() > 0.7 and 1.3 or 1
        setWidths(beam, preset, flicker)
        beam.LightEmission = math.random() > 0.6 and 1 or preset.LightEmission * 0.8
        beam.Color = colorSeq(hsv(t * 0.5, 1, 1), hsv(t * 0.5 + 0.33, 1, 1), hsv(t * 0.5 + 0.66, 1, 1))

    elseif anim == "laser" then
        local p = 1 + math.sin(t * 8) * 0.05
        setWidths(beam, preset, p)
        beam.LightEmission = 1
        beam.Transparency = transSeq(preset.Transparency, math.sin(t * 10) * 0.02)

    elseif anim == "ribbon" then
        local flow = math.sin(t * 2.5) * 0.2
        setWidths(beam, preset, 1 + flow, 1 - flow * 0.5)
        beam.TextureLength = preset.TextureLength + math.sin(t * 1.5) * 0.3

    elseif anim == "molten" then
        local drip = math.sin(t * 1.8) * 0.18
        setWidths(beam, preset, 1 + drip, 0.9 + math.sin(t * 2.5) * 0.15)
        beam.Color = colorSeq(rgb(255, 80 + math.sin(t*3)*40, 0), rgb(255, 150, 0), rgb(80, 20, 0))

    elseif anim == "toxicwaste" then
        local bubble = math.random() > 0.8 and 1.25 or 1
        setWidths(beam, preset, bubble)
        beam.Transparency = transSeq(preset.Transparency, math.sin(t * 3) * 0.08)
        beam.TextureSpeed = preset.TextureSpeed + math.random(-2, 2) / 10

    elseif anim == "tendril" then
        local writhe = math.sin(t * 3) * 0.25
        setWidths(beam, preset, 1 + writhe, 0.5 + math.sin(t * 4) * 0.3)
        beam.Transparency = transSeq(preset.Transparency, 0.1 + math.sin(t * 2) * 0.15)

    elseif anim == "holy" then
        local ray = math.sin(t * 2.5) * 0.12
        setWidths(beam, preset, 1 - ray, 1 + ray)
        beam.LightEmission = 1
        beam.Color = colorSeq(rgb(255, 255, 200 + math.sin(t*3)*55), rgb(255, 220, 100), rgb(255, 255, 255))

    elseif anim == "frost" then
        local crystal = 1 + math.sin(t * 1.2) * 0.1
        setWidths(beam, preset, crystal)
        beam.LightEmission = preset.LightEmission + math.sin(t * 2) * 0.1
        beam.TextureLength = preset.TextureLength + math.sin(t * 0.5) * 0.2

    elseif anim == "diamond" then
        local edge = math.floor(t * 6) % 2 == 0 and 1.2 or 0.9
        setWidths(beam, preset, edge)
        beam.LightEmission = edge > 1 and 1 or preset.LightEmission

    elseif anim == "royal" then
        local shimmer = (math.sin(t * 2.5) + 1) * 0.5
        setWidths(beam, preset, 1 + shimmer * 0.08)
        beam.Color = colorSeq(rgb(255, 215, 0), rgb(255, 255, 150 + shimmer*50), rgb(184, 134, 11))

    elseif anim == "galaxy" then
        beam.Color = colorSeq(hsv(t * 0.03, 0.8, 1), hsv(t * 0.03 + 0.25, 0.9, 0.8), hsv(t * 0.03 + 0.5, 0.6, 1))
        setWidths(beam, preset, 1 + math.sin(t * 1.5) * 0.12)
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 0.5) * 0.2

    elseif anim == "love" then
        local beat = math.sin(t * 4) > 0.7 and 1.3 or 1
        setWidths(beam, preset, beat)
        beam.LightEmission = beat > 1 and 1 or preset.LightEmission

    elseif anim == "sweet" then
        local swirl = math.sin(t * 2) * 0.15
        setWidths(beam, preset, 1 + swirl, 1 - swirl * 0.5)
        beam.Color = colorSeq(hsv(t * 0.1, 0.8, 1), hsv(t * 0.1 + 0.33, 0.9, 1), hsv(t * 0.1 + 0.66, 0.7, 1))

    elseif anim == "prismatic" then
        beam.Color = colorSeq(hsv(t * 0.15), hsv(t * 0.15 + 0.33), hsv(t * 0.15 + 0.66))
        setWidths(beam, preset, 1 + math.sin(t * 3) * 0.06)
        beam.LightEmission = 1

    elseif anim == "hacker" then
        local rain = math.random() > 0.85 and 0.7 or 1
        setWidths(beam, preset, rain)
        beam.TextureSpeed = preset.TextureSpeed + math.random(-5, 5)
        beam.LightEmission = math.random() > 0.7 and 1 or 0.7

    elseif anim == "abyss" then
        local swallow = 1 + math.sin(t * 1.5) * 0.2
        setWidths(beam, preset, swallow, 0.6 + math.sin(t * 2) * 0.2)
        beam.Transparency = transSeq(preset.Transparency, 0.1 + math.sin(t * 1.2) * 0.2)

    elseif anim == "crimson" then
        local flow = 1 + math.sin(t * 2) * 0.12
        setWidths(beam, preset, flow)
        beam.Color = colorSeq(rgb(220 + math.sin(t*4)*35, 20, 60), rgb(139, 0, 0), rgb(255, 69, 0))

    elseif anim == "neonpulse" then
        local strobe = math.floor(t * 10) % 2 == 0 and 1.4 or 0.8
        setWidths(beam, preset, strobe)
        beam.LightEmission = strobe > 1 and 1 or 0.5
        beam.Color = colorSeq(hsv(t * 0.2, 1, 1), hsv(t * 0.2 + 0.33, 1, 1), hsv(t * 0.2 + 0.66, 1, 1))

    elseif anim == "static" then
        local noise = 0.8 + math.random() * 0.4
        setWidths(beam, preset, noise)
        beam.LightEmission = math.random() > 0.5 and 1 or 0.3
        beam.TextureSpeed = preset.TextureSpeed + math.random(-10, 10)

    elseif anim == "solar" then
        local flare = 1 + math.sin(t * 3) * 0.25
        setWidths(beam, preset, flare, 0.7 + math.sin(t * 5) * 0.2)
        beam.Color = colorSeq(rgb(255, 140 + math.sin(t*4)*50, 0), rgb(255, 255, 0), rgb(255, 69, 0))
        beam.LightEmission = 1

    elseif anim == "arctic" then
        local gust = 1 + math.sin(t * 0.8) * 0.15
        setWidths(beam, preset, gust)
        beam.Transparency = transSeq(preset.Transparency, math.sin(t * 1.5) * 0.1)
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 0.5) * 0.3

    elseif anim == "emerald" then
        local pulse = 1 + math.sin(t * 2.2) * 0.1
        setWidths(beam, preset, pulse)
        beam.Color = colorSeq(rgb(0, 255, 127 + math.sin(t*3)*50), rgb(50, 205, 50), rgb(144, 238, 144))
        beam.LightEmission = preset.LightEmission + math.sin(t * 2) * 0.1

    elseif anim == "ruby" then
        local beat = 1 + math.sin(t * 3) * 0.12
        setWidths(beam, preset, beat)
        beam.Color = colorSeq(rgb(255, 0, 0), rgb(220 + math.sin(t*5)*35, 20, 60), rgb(255, 99, 71))

    elseif anim == "sapphire" then
        local wave = 1 + math.sin(t * 1.8) * 0.1
        setWidths(beam, preset, wave)
        beam.Color = colorSeq(rgb(0, 0, 255), rgb(65 + math.sin(t*3)*30, 105, 225), rgb(135, 206, 250))
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 1.2) * 0.5

    elseif anim == "amethyst" then
        local shimmer = (math.sin(t * 2) + 1) * 0.5
        setWidths(beam, preset, 1 + shimmer * 0.08)
        beam.Color = colorSeq(rgb(153, 50, 204), rgb(138 + shimmer*50, 43, 226), rgb(216, 191, 216))

    elseif anim == "obsidian" then
        local dark = 1 + math.sin(t * 1.5) * 0.15
        setWidths(beam, preset, dark)
        beam.Transparency = transSeq(preset.Transparency, 0.1 + math.sin(t * 2) * 0.2)
        beam.LightEmission = math.max(0.1, preset.LightEmission + math.sin(t * 3) * 0.2)

    elseif anim == "pearl" then
        local glow = (math.sin(t * 1.2) + 1) * 0.5
        setWidths(beam, preset, 1 + glow * 0.06)
        beam.LightEmission = preset.LightEmission + glow * 0.15
        beam.Color = colorSeq(rgb(255, 255, 240), rgb(245 + glow*10, 245, 220), rgb(255, 255, 255))

    elseif anim == "coral" then
        local sway = math.sin(t * 1.5) * 0.12
        setWidths(beam, preset, 1 + sway, 1 - sway * 0.5)
        beam.Color = colorSeq(rgb(255, 127 + math.sin(t*2)*30, 80), rgb(255, 160, 122), rgb(255, 218, 185))

    elseif anim == "mint" then
        local breeze = 1 + math.sin(t * 2.5) * 0.08
        setWidths(beam, preset, breeze)
        beam.Transparency = transSeq(preset.Transparency, math.sin(t * 2) * 0.06)
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 1.5) * 0.4

    elseif anim == "lavender" then
        local soft = (math.sin(t * 1.8) + 1) * 0.5
        setWidths(beam, preset, 1 + soft * 0.06)
        beam.Color = colorSeq(rgb(230, 230, 250), rgb(221 + soft*20, 160, 221), rgb(255, 240, 245))

    elseif anim == "sunset" then
        local shift = t * 0.2
        beam.Color = colorSeq(hsv(0.05 + shift % 0.1, 0.9, 1), hsv(0.1 + shift % 0.15, 0.8, 1), hsv(0.15 + shift % 0.1, 0.7, 1))
        setWidths(beam, preset, 1 + math.sin(t * 2) * 0.08)

    elseif anim == "ocean" then
        local tide = 1 + math.sin(t * 0.6) * 0.15
        setWidths(beam, preset, tide)
        beam.Color = colorSeq(rgb(0, 105 + math.sin(t*2)*40, 148), rgb(0, 149, 182), rgb(64, 224, 208))
        beam.TextureSpeed = preset.TextureSpeed + math.sin(t * 0.8) * 0.3

    elseif anim == "volcanic" then
        local erupt = math.random() > 0.85 and 1.5 or 1 + math.sin(t * 2) * 0.15
        setWidths(beam, preset, erupt)
        beam.Color = colorSeq(rgb(255, 69, 0), rgb(139 + math.sin(t*4)*50, 0, 0), rgb(0, 0, 0))
        beam.LightEmission = erupt > 1.2 and 1 or preset.LightEmission

    elseif anim == "thunder" then
        local strike = math.random() > 0.9 and 2 or 1
        setWidths(beam, preset, strike)
        beam.LightEmission = strike > 1 and 1 or 0.5
        beam.Transparency = transSeq(preset.Transparency, strike > 1 and -0.2 or 0)

    elseif anim == "spirit" then
        local ethereal = 0.8 + math.sin(t * 1.5) * 0.2
        setWidths(beam, preset, ethereal)
        beam.Transparency = transSeq(preset.Transparency, 0.05 + math.sin(t * 2) * 0.1)
        beam.LightEmission = preset.LightEmission + math.sin(t * 1.5) * 0.2

    elseif anim == "venom" then
        local drip = 1 + math.sin(t * 2.5) * 0.15
        setWidths(beam, preset, drip, 0.8 + math.sin(t * 3.5) * 0.15)
        beam.Color = colorSeq(rgb(128, 0, 128), rgb(75 + math.sin(t*4)*30, 0, 130), rgb(0, 255, 0))

    elseif anim == "phoenix" then
        local rise = 1 + math.sin(t * 2.5) * 0.2
        setWidths(beam, preset, rise)
        beam.Color = colorSeq(rgb(255, 69 + math.sin(t*3)*40, 0), rgb(255, 140, 0), rgb(255, 215, 0))
        beam.LightEmission = 1

    elseif anim == "frostdragon" then
        local breath = 1 + math.sin(t * 2) * 0.18
        setWidths(beam, preset, breath, 0.7 + math.sin(t * 3) * 0.2)
        beam.Color = colorSeq(rgb(0, 191, 255), rgb(135 + math.sin(t*2)*40, 206, 250), rgb(255, 255, 255))
        beam.Transparency = transSeq(preset.Transparency, math.sin(t * 2) * 0.08)

    elseif anim == "shadowdragon" then
        local dark = 1 + math.sin(t * 1.8) * 0.2
        setWidths(beam, preset, dark, 0.5 + math.sin(t * 2.5) * 0.25)
        beam.Transparency = transSeq(preset.Transparency, 0.15 + math.sin(t * 2) * 0.2)
        beam.LightEmission = math.max(0.1, 0.35 + math.sin(t * 3) * 0.25)
    end
end

local function stopLineConnections()
    if cons["lineadded"] then
        cons["lineadded"]:Disconnect()
        cons["lineadded"] = nil
    end

    if cons["lineremoving"] then
        cons["lineremoving"]:Disconnect()
        cons["lineremoving"] = nil
    end

    if cons["lineanim"] then
        cons["lineanim"]:Disconnect()
        cons["lineanim"] = nil
    end

    table.clear(activeLines)
end

local function startLineConnections()
    stopLineConnections()
    applyAllLines()

    cons["lineadded"] = workspace.DescendantAdded:Connect(function(d)
        if isGrabBeam(d) then
            task.defer(function()
                applyLinePreset(d)
            end)
        end
    end)

    cons["lineremoving"] = workspace.DescendantRemoving:Connect(function(d)
        activeLines[d] = nil
    end)

    cons["lineanim"] = RunService.Heartbeat:Connect(function(dt)
        if not lineState.Enabled then return end

        lineState.Time += dt
        lineState.Tick += dt

        -- 20 FPS animation update, much lighter than every rendered frame.
        if lineState.Tick < 0.05 then return end
        lineState.Tick = 0

        cleanCache()

        local preset = linePresets[lineState.Preset] or linePresets.Aura
        for beam in pairs(activeLines) do
            animateBeam(beam, preset)
        end
    end)
end

leftBox:AddDropdown("LineTexture", {
    Text = "Line Style",
    Values = lineValues,
    Default = 1,
    Multi = false,
    Callback = function(v)
        lineState.Preset = v or "Aura"

        if lineState.Enabled then
            applyAllLines()
        end
    end
})

leftBox:AddToggle("CustomLine", {
    Text = "Animated Custom Line",
    Default = false,
    Callback = function(v)
        lineState.Enabled = v

        if v then
            startLineConnections()
        else
            stopLineConnections()
        end
    end
})


    --// ============================================
    --// RECHTE SEITE - CAMERA & GRAPHICS
    --// ============================================
    
    local rightBox = Tabs.Visual:AddRightGroupbox("Camera & Graphics")
    
    --// CAMERA SECTION
    rightBox:AddLabel("Camera", true)
    
    -- Third Person Toggle
    rightBox:AddToggle("ThirdPerson", {
        Text = "Third Person",
        Default = false,
        Callback = function(v)
            local thirdp = v
            if v then
                plr.CameraMaxZoomDistance = 100000
                plr.CameraMode = Enum.CameraMode.Classic
                task.spawn(function()
                    while thirdp and task.wait(0.1) do
                        local chara = plr.Character
                        if chara then
                            for _, part in pairs(chara:GetChildren()) do
                                if part:IsA("Part") and part.Name ~= "HumanoidRootPart" and part.Name ~= "CamPart" and HasProperty(part, "Transparency") then
                                    part.Transparency = 0
                                end
                                if part:IsA("Accessory") and part.Name ~= "TypingKeyboardMyWorld" then
                                    local accPart = part:FindFirstChildOfClass("Part")
                                    if accPart then accPart.Transparency = 0 end
                                end
                            end
                        end
                    end
                end)
            else
                plr.CameraMaxZoomDistance = 10
                plr.CameraMode = Enum.CameraMode.Classic
            end
        end
    })

    local altShiftLockActive = false
local altShiftLockConnection = nil
local altInputConnection = nil
local isShiftLockToggled = false
local originalAutoRotate = nil
local originalCameraOffset = Vector3.new(0, 0, 0)
local altWasPressed = false -- Verhindert mehrfaches Togglen bei gedrückter Alt-Taste

rightBox:AddToggle("AltShiftLock", {
    Text = "Alt Shift Lock",
    Default = false,
    Callback = function(v)
        altShiftLockActive = v
        
        -- Verbindungen sauber aufräumen
        if altShiftLockConnection then
            altShiftLockConnection:Disconnect()
            altShiftLockConnection = nil
        end
        if altInputConnection then
            altInputConnection:Disconnect()
            altInputConnection = nil
        end
        
        local chara = plr.Character
        local hum = chara and chara:FindFirstChildOfClass("Humanoid")
        
        if v then
            -- Originalzustand merken
            if hum then 
                originalAutoRotate = hum.AutoRotate
                originalCameraOffset = hum.CameraOffset
            end
            isShiftLockToggled = false
            altWasPressed = false
            
            -- 1. InputBegan: Alt drücken
            altInputConnection = UserInputService.InputBegan:Connect(function(input, gameProcessed)
                if gameProcessed then return end
                
                if (input.KeyCode == Enum.KeyCode.LeftAlt or input.KeyCode == Enum.KeyCode.RightAlt) and not altWasPressed then
                    altWasPressed = true
                    isShiftLockToggled = not isShiftLockToggled
                end
            end)
            
            -- InputEnded: Alt loslassen (wichtig!)
            UserInputService.InputEnded:Connect(function(input, gameProcessed)
                if input.KeyCode == Enum.KeyCode.LeftAlt or input.KeyCode == Enum.KeyCode.RightAlt then
                    altWasPressed = false
                end
            end)
            
            -- 2. RenderStepped für die visuelle Ausführung
            altShiftLockConnection = RunService.RenderStepped:Connect(function()
                if not altShiftLockActive then return end
                
                local chara = plr.Character
                local hum = chara and chara:FindFirstChildOfClass("Humanoid")
                local root = chara and chara:FindFirstChild("HumanoidRootPart")
                local cam = workspace.CurrentCamera
                
                if not hum or not root or not cam then return end
                
                if isShiftLockToggled then
                    -- === SHIFTLOCK AKTIV ===
                    hum.AutoRotate = false
                    
                    -- Charakter zur Kamera drehen
                    local camCF = cam.CFrame
                    local _, camY, _ = camCF:ToEulerAnglesYXZ()
                    root.CFrame = CFrame.new(root.Position) * CFrame.Angles(0, camY, 0)
                    
                    -- CameraOffset nur setzen wenn nötig
                    local targetOffset = Vector3.new(1.75, 0, 0)
                    if (hum.CameraOffset - targetOffset).Magnitude > 0.01 then
                        hum.CameraOffset = hum.CameraOffset:Lerp(targetOffset, 0.2)
                    else
                        hum.CameraOffset = targetOffset
                    end
                    
                    UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter
                    
                else
                    -- === SHIFTLOCK INAKTIV ===
                    -- AutoRotate nur zurücksetzen wenn es false ist
                    if hum.AutoRotate == false then
                        hum.AutoRotate = true
                    end
                    
                    -- CameraOffset nur zurücksetzen wenn nötig
                    local targetOffset = Vector3.new(0, 0, 0)
                    if (hum.CameraOffset - targetOffset).Magnitude > 0.01 then
                        hum.CameraOffset = hum.CameraOffset:Lerp(targetOffset, 0.2)
                    else
                        hum.CameraOffset = targetOffset
                    end
                    
                    -- MouseBehavior NICHT mehr jeden Frame auf Default setzen!
                    -- Das war der Hauptbug — das blockiert die normale Kamera-Steuerung
                    -- Wir setzen es nur EINMAL beim Deaktivieren (siehe else-Zweig oben)
                end
            end)
            
        else
            -- === TOGGLE AUS === Alles zurücksetzen
            isShiftLockToggled = false
            altWasPressed = false
            
            -- MouseBehavior einmalig zurücksetzen
            UserInputService.MouseBehavior = Enum.MouseBehavior.Default
            
            if hum then 
                hum.AutoRotate = (originalAutoRotate ~= nil) and originalAutoRotate or true
                hum.CameraOffset = originalCameraOffset or Vector3.new(0, 0, 0)
            end
        end
    end
})
    
    -- FOV Slider
    rightBox:AddSlider("FOV", {
        Text = "FOV",
        Default = 70,
        Min = 30,
        Max = 120,
        Rounding = 0,
        Suffix = "",
        Callback = function(v)
            camera.FieldOfView = v
        end
    })
    
    --// GRAPHICS SECTION
    rightBox:AddLabel("Graphics", true)
    
    -- Shaders Toggle
    rightBox:AddToggle("Shaders", {
        Text = "Shaders",
        Default = false,
        Callback = function(v)
            if v then
                local blur = Instance.new("BlurEffect")
                blur.Name = "Pexus_Blur"
                blur.Size = 4
                blur.Parent = camera
                
                local colorCorrection = Instance.new("ColorCorrectionEffect")
                colorCorrection.Name = "Pexus_Color"
                colorCorrection.Brightness = 0.05
                colorCorrection.Contrast = 0.1
                colorCorrection.Saturation = 0.15
                colorCorrection.Parent = camera
                
                local bloom = Instance.new("BloomEffect")
                bloom.Name = "Pexus_Bloom"
                bloom.Intensity = 0.4
                bloom.Size = 24
                bloom.Threshold = 0.9
                bloom.Parent = camera
            else
                for _, effect in pairs(camera:GetChildren()) do
                    if effect.Name:find("Pexus_") then
                        effect:Destroy()
                    end
                end
            end
        end
    })
    
    -- Time of Day Slider
    rightBox:AddSlider("TimeOfDay", {
        Text = "Time of Day",
        Default = 12,
        Min = 0,
        Max = 24,
        Rounding = 0,
        Suffix = "",
        Callback = function(v)
            game:GetService("Lighting").TimeOfDay = v .. ":00:00"
        end
    })
    
    -- Load PShade Button
    rightBox:AddButton("Load PShade", function()
        loadstring(game:HttpGet('https://raw.githubusercontent.com/randomstring0/pshade-ultimate/refs/heads/main/src/cd.lua'))()
        Library:Notify("PShade loaded!", 3)
    end)
    
    -- REALISTIC PARTICLES / AURA
local particleOptions = {
    ["Aura"] = {
        Texture = "rbxassetid://258128463",
        Colors = {Color3.fromRGB(180, 220, 255), Color3.fromRGB(120, 140, 255), Color3.fromRGB(255, 255, 255)},
        Size = {0.15, 1.15, 2.35},
        Transparency = {0.9, 0.35, 1},
        Lifetime = {1.6, 3.2},
        Rate = 70,
        Speed = {0.15, 1.0},
        Spread = Vector2.new(360, 360),
        Drag = 1.6,
        Acceleration = Vector3.new(0, 0.7, 0),
        LightEmission = 0.85,
        ZOffset = 0.6
    },
    ["Fire"] = {
        Texture = "rbxassetid://243660361",
        Colors = {Color3.fromRGB(255, 70, 15), Color3.fromRGB(255, 170, 40), Color3.fromRGB(80, 20, 5)},
        Size = {0.25, 1.4, 0.1},
        Transparency = {0.25, 0.45, 1},
        Lifetime = {0.45, 1.25},
        Rate = 120,
        Speed = {1.2, 4.2},
        Spread = Vector2.new(35, 70),
        Drag = 0.45,
        Acceleration = Vector3.new(0, 4.5, 0),
        LightEmission = 1,
        ZOffset = -0.2
    },
    ["Smoke"] = {
        Texture = "rbxassetid://258128437",
        Colors = {Color3.fromRGB(160, 160, 165), Color3.fromRGB(75, 75, 85), Color3.fromRGB(35, 35, 42)},
        Size = {0.65, 2.8, 4.5},
        Transparency = {0.55, 0.72, 1},
        Lifetime = {2.4, 5},
        Rate = 38,
        Speed = {0.15, 1.1},
        Spread = Vector2.new(360, 360),
        Drag = 1.2,
        Acceleration = Vector3.new(0, 1.0, 0),
        LightEmission = 0.05,
        ZOffset = 1
    },
    ["Sparkles"] = {
        Texture = "rbxassetid://258128445",
        Colors = {Color3.fromRGB(255, 255, 180), Color3.fromRGB(255, 190, 70), Color3.fromRGB(255, 255, 255)},
        Size = {0.05, 0.35, 0},
        Transparency = {0.05, 0.18, 1},
        Lifetime = {0.35, 1.1},
        Rate = 165,
        Speed = {1.5, 5.5},
        Spread = Vector2.new(360, 360),
        Drag = 0.35,
        Acceleration = Vector3.new(0, -0.4, 0),
        LightEmission = 1,
        ZOffset = -0.6
    },
    ["Magic"] = {
        Texture = "rbxassetid://258128493",
        Colors = {Color3.fromRGB(210, 120, 255), Color3.fromRGB(90, 170, 255), Color3.fromRGB(255, 255, 255)},
        Size = {0.08, 0.85, 0.15},
        Transparency = {0.1, 0.3, 1},
        Lifetime = {1.0, 2.4},
        Rate = 95,
        Speed = {0.6, 2.8},
        Spread = Vector2.new(360, 360),
        Drag = 0.8,
        Acceleration = Vector3.new(0, 1.4, 0),
        LightEmission = 1,
        ZOffset = -0.4
    }
}

local function getParticleScale()
    return ((Options.ParticleSize and Options.ParticleSize.Value) or 100) / 100
end

local function getParticleDensity()
    return ((Options.ParticleRate and Options.ParticleRate.Value) or 100) / 100
end

local function makeColorSequence(opts)
    return ColorSequence.new({
        ColorSequenceKeypoint.new(0, opts.Colors[1]),
        ColorSequenceKeypoint.new(0.55, opts.Colors[2]),
        ColorSequenceKeypoint.new(1, opts.Colors[3])
    })
end

local function makeSizeSequence(opts, scale, soft)
    local mul = soft and 0.55 or 1
    return NumberSequence.new({
        NumberSequenceKeypoint.new(0, opts.Size[1] * scale * mul),
        NumberSequenceKeypoint.new(0.45, opts.Size[2] * scale * mul),
        NumberSequenceKeypoint.new(1, opts.Size[3] * scale * mul)
    })
end

local function makeTransparencySequence(opts, extra)
    extra = extra or 0
    return NumberSequence.new({
        NumberSequenceKeypoint.new(0, math.clamp(opts.Transparency[1] + extra, 0, 1)),
        NumberSequenceKeypoint.new(0.45, math.clamp(opts.Transparency[2] + extra, 0, 1)),
        NumberSequenceKeypoint.new(1, 1)
    })
end

local function applyEmitter(emitter, opts, soft)
    local scale = getParticleScale()
    local density = getParticleDensity()

    emitter.Texture = opts.Texture
    emitter.Color = makeColorSequence(opts)
    emitter.Size = makeSizeSequence(opts, scale, soft)
    emitter.Transparency = makeTransparencySequence(opts, soft and 0.25 or 0)
    emitter.Lifetime = NumberRange.new(opts.Lifetime[1], opts.Lifetime[2])
    emitter.Rate = opts.Rate * density * (soft and 0.45 or 1)
    emitter.Speed = NumberRange.new(opts.Speed[1] * (soft and 0.45 or 1), opts.Speed[2] * (soft and 0.7 or 1))
    emitter.SpreadAngle = opts.Spread
    emitter.Drag = opts.Drag
    emitter.Acceleration = opts.Acceleration
    emitter.LightEmission = opts.LightEmission
    emitter.ZOffset = opts.ZOffset
    emitter.Rotation = NumberRange.new(-180, 180)
    emitter.RotSpeed = NumberRange.new(soft and -18 or -55, soft and 18 or 55)
    emitter.LockedToPart = false
    emitter.Enabled = true
end

local function getAuraFolder(hrp)
    return hrp:FindFirstChild("Pexus_Aura")
end

local function applyPresetToAura()
    local char = plr.Character
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    local folder = hrp and getAuraFolder(hrp)
    if not folder then return end

    local selected = Options.ParticleType and Options.ParticleType.Value or "Aura"
    local opts = particleOptions[selected] or particleOptions.Aura

    for _, obj in ipairs(folder:GetDescendants()) do
        if obj:IsA("ParticleEmitter") then
            applyEmitter(obj, opts, obj.Name == "SoftGlow")
        elseif obj:IsA("PointLight") then
            obj.Color = opts.Colors[2]
            obj.Brightness = math.clamp(opts.LightEmission * 1.8, 0.25, 2)
        end
    end
end

rightBox:AddDropdown("ParticleType", {
    Text = "Particle Effect",
    Values = {"Aura", "Fire", "Smoke", "Sparkles", "Magic"},
    Default = 1,
    Multi = false,
    Callback = function()
        applyPresetToAura()
    end
})

rightBox:AddToggle("Particles", {
    Text = "Particle Effects",
    Default = false,
    Callback = function(enabled)
        local char = plr.Character
        local hrp = char and char:FindFirstChild("HumanoidRootPart")
        if not hrp then return end

        local old = getAuraFolder(hrp)
        if old then old:Destroy() end
        if not enabled then return end

        local folder = Instance.new("Folder")
        folder.Name = "Pexus_Aura"
        folder.Parent = hrp

        local center = Instance.new("Attachment")
        center.Name = "AuraCenter"
        center.Position = Vector3.new(0, 1.1, 0)
        center.Parent = folder

        local base = Instance.new("Attachment")
        base.Name = "AuraBase"
        base.Position = Vector3.new(0, -1.15, 0)
        base.Parent = folder

        local main = Instance.new("ParticleEmitter")
        main.Name = "MainAura"
        main.Parent = center

        local soft = Instance.new("ParticleEmitter")
        soft.Name = "SoftGlow"
        soft.Parent = base

        local light = Instance.new("PointLight")
        light.Name = "AuraLight"
        light.Range = 8
        light.Shadows = false
        light.Parent = center

        applyPresetToAura()

        task.spawn(function()
            local t = 0
            while folder.Parent and Toggles.Particles and Toggles.Particles.Value do
                t += 0.035
                center.Position = Vector3.new(math.sin(t) * 0.18, 1.1 + math.sin(t * 1.7) * 0.08, math.cos(t) * 0.18)
                base.Position = Vector3.new(math.cos(t * 0.7) * 0.12, -1.15, math.sin(t * 0.7) * 0.12)
                center.Orientation = Vector3.new(0, (t * 75) % 360, 0)
                base.Orientation = Vector3.new(0, -(t * 45) % 360, 0)
                task.wait(0.03)
            end
        end)
    end
})

rightBox:AddSlider("ParticleRate", {
    Text = "Particle Density",
    Default = 100,
    Min = 10,
    Max = 220,
    Callback = applyPresetToAura
})

rightBox:AddSlider("ParticleSize", {
    Text = "Particle Size",
    Default = 100,
    Min = 40,
    Max = 220,
    Callback = applyPresetToAura
})
end


--// TOY LIST (Short name -> Real name)
local ToyList = {
	["Coconut"]     = "FoodCoconut",
	["Banana"]      = "FoodBanana",
	["Fries"]       = "FoodFrenchFries",
	["MeatStick"]   = "FoodMeatStick",
	["Poop"]        = "PoopPile",
	["Donut"]       = "FoodDonut",
	["Cake"]        = "FoodCakePink",
	["Burger"]      = "FoodHamburger",
	["Pizza"]       = "FoodPizzaCheese",
	["Hotdog"]      = "FoodHotdog",
	["Mushroom"]    = "FoodMushroomPoison",
	["Banjo"]       = "InstrumentGuitarBanjo",
	["Violin"]      = "InstrumentGuitarViolin",
	["Ukulele"]     = "InstrumentGuitarUkulele",
	["Sax"]         = "InstrumentWoodwindSaxophone",
	["Vuvuzela"]    = "InstrumentBrassVuvuzela",
	["Bongos"]      = "InstrumentDrumBongos",
	["Mic"]         = "InstrumentVoiceMicrophone",
	["Pepperoni"]   = "FoodPizzaPepperoni",
	["Piano"]       = "InstrumentPianoMelodica",
	["Bread"]       = "FoodBread",
	["Egg"]         = "FoodDippyEgg",
	["Mayo"]        = "FoodMayonnaise",
	["WhiteMug"]    = "CupMugWhite",
	["Ocarina"]     = "InstrumentWoodwindOcarina",
	["SparklePoop"] = "PoopPileSparkle",
	["BrownMug"]    = "CupMugBrown",
	["Trumpet"]     = "InstrumentBrassTrumpet",
	["Snare"]       = "InstrumentDrumSnare",
}

-- Dropdown Werte aus der ToyList erstellen
local toyDropdownValues = {}
for shortName, _ in pairs(ToyList) do
	table.insert(toyDropdownValues, shortName)
end

do
    -- Linke Groupbox: Antis
    local boxLeft = Tabs.Defence:AddLeftGroupbox("Antis")

    local RunService = game:GetService("RunService")
    local moveConn

    -- Anti-Grab Funktion für Obsidian Lib (boxLeft:AddToggle)

-- Services
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ContextActionService = game:GetService("ContextActionService")

-- Local Player
local LocalPlayer = Players.LocalPlayer

-- Remotes
local CharacterEvents = ReplicatedStorage:WaitForChild("CharacterEvents")
local StruggleRemote = CharacterEvents:WaitForChild("Struggle")
local RagdollRemote = CharacterEvents:WaitForChild("RagdollRemote")

-- Toggle State
local AntiGrabEnabled = false
local AntiGrabConnection = nil
local CharacterConnections = {}

-- Helper: Get Character Part
local function GetPart(name)
    local char = LocalPlayer.Character
    if not char then return nil end
    return char:FindFirstChild(name)
end

-- Helper: Get Humanoid
local function GetHumanoid()
    return GetPart("Humanoid")
end

-- Helper: Get HRP
local function GetHRP()
    return GetPart("HumanoidRootPart")
end

-- Helper: Disconnect all character connections
local function ClearCharacterConnections()
    for _, conn in pairs(CharacterConnections) do
        if conn then
            pcall(function() conn:Disconnect() end)
        end
    end
    CharacterConnections = {}
end

-- Anti-Grab Main Loop
local function StartAntiGrab()
    if AntiGrabConnection then
        AntiGrabConnection:Disconnect()
        AntiGrabConnection = nil
    end

    AntiGrabConnection = RunService.RenderStepped:Connect(function()
        if not AntiGrabEnabled then return end
        
        local hrp = GetHRP()
        local humanoid = GetHumanoid()
        if not hrp or not humanoid then return end

        -- Check if being grabbed (ReceiveAge ~= 0 means network ownership taken)
        if hrp.ReceiveAge ~= 0 then
            -- Anchor first to prevent teleport
            hrp.Anchored = true

            -- Reset IsHeld
            local isHeld = LocalPlayer:FindFirstChild("IsHeld")
            if isHeld and isHeld:IsA("BoolValue") then
                isHeld.Value = false
            end

            -- Fire struggle & ragdoll remotes to break grab
            task.spawn(function()
                pcall(function()
                    StruggleRemote:FireServer()
                    RagdollRemote:FireServer(hrp, 0)
                end)
            end)

            -- Unbind jump remover (prevents movement lock)
            pcall(function()
                ContextActionService:UnbindAction("JumpRemover")
            end)

            -- Force AutoRotate
            humanoid.AutoRotate = true

            -- Force RootJoint
            local rootJoint = hrp:FindFirstChild("RootJoint")
            if rootJoint and rootJoint:IsA("Motor6D") then
                rootJoint.Enabled = true
            end

            -- Force PlatformStand off
            humanoid.PlatformStand = false

            -- Unanchor after fixes
            hrp.Anchored = false
        else
            -- Ensure unanchored when not grabbed
            if hrp.Anchored then
                hrp.Anchored = false
            end
        end
    end)
end

local function StopAntiGrab()
    if AntiGrabConnection then
        AntiGrabConnection:Disconnect()
        AntiGrabConnection = nil
    end
    
    -- Unanchor if stopping
    local hrp = GetHRP()
    if hrp then
        hrp.Anchored = false
    end
end

-- Character Added Setup
local function OnCharacterAdded(char)
    task.wait(0.5)
    
    -- Clear old connections
    ClearCharacterConnections()
    
    -- Motor6D Protection (prevents joints being disabled)
    local torso = char:FindFirstChild("Torso")
    if torso then
        for _, joint in pairs(torso:GetChildren()) do
            if joint:IsA("Motor6D") then
                local conn = joint:GetPropertyChangedSignal("Enabled"):Connect(function()
                    if AntiGrabEnabled and not joint.Enabled then
                        joint.Enabled = true
                    end
                end)
                table.insert(CharacterConnections, conn)
            end
        end
    end

    -- Property Protection
    local humanoid = char:FindFirstChild("Humanoid")
    local hrp = char:FindFirstChild("HumanoidRootPart")
    
    if humanoid and hrp then
        -- Anti-Ragdoll
        local ragdolled = humanoid:FindFirstChild("Ragdolled")
        if ragdolled and ragdolled:IsA("BoolValue") then
            local conn = ragdolled:GetPropertyChangedSignal("Value"):Connect(function()
                if AntiGrabEnabled and ragdolled.Value then
                    ragdolled.Value = false
                end
            end)
            table.insert(CharacterConnections, conn)
        end

        -- Anti-Grab Animation
        local animator = humanoid:FindFirstChild("Animator")
        if animator and animator:IsA("Animator") then
            local conn = animator.AnimationPlayed:Connect(function(track)
                if not track or not track.Animation then return end
                if track.Animation.AnimationId == "rbxassetid://7047322890" and AntiGrabEnabled then
                    track:Stop()
                    track:Destroy()
                end
            end)
            table.insert(CharacterConnections, conn)
        end

        -- Anti-Massless
        local conn = hrp:GetPropertyChangedSignal("Massless"):Connect(function()
            if hrp.Massless and humanoid.SeatPart == nil then
                hrp.Massless = false
            end
        end)
        table.insert(CharacterConnections, conn)

        -- Anti-Sit
        local conn = humanoid:GetPropertyChangedSignal("Sit"):Connect(function()
            if AntiGrabEnabled and humanoid.Sit and not humanoid.SeatPart then
                pcall(function()
                    humanoid:ChangeState(Enum.HumanoidStateType.GettingUp)
                    humanoid.Sit = false
                end)
            end
        end)
        table.insert(CharacterConnections, conn)

        -- Force AutoRotate
        local conn = humanoid:GetPropertyChangedSignal("AutoRotate"):Connect(function()
            if not humanoid.AutoRotate and AntiGrabEnabled then
                humanoid.AutoRotate = true
            end
        end)
        table.insert(CharacterConnections, conn)
        
        -- Anti-PlatformStand
        local conn = humanoid:GetPropertyChangedSignal("PlatformStand"):Connect(function()
            if humanoid.PlatformStand and AntiGrabEnabled then
                humanoid.PlatformStand = false
            end
        end)
        table.insert(CharacterConnections, conn)
    end

    -- Restart loop if enabled
    if AntiGrabEnabled then
        StartAntiGrab()
    end
end

-- Initial Setup
if LocalPlayer.Character then
    task.spawn(function()
        OnCharacterAdded(LocalPlayer.Character)
    end)
end
LocalPlayer.CharacterAdded:Connect(OnCharacterAdded)

-- Obsidian Lib Toggle (Callback bleibt gleich!)
boxLeft:AddToggle("AntiGrab", {
    Text = "Anti Grab",
    Default = false,
    Tooltip = "Schützt vor Grab-Attacken anderer Spieler",
    Callback = function(Value)
        AntiGrabEnabled = Value
        
        if Value then
            StartAntiGrab()
            
            -- Immediate check if already grabbed
            local hrp = GetHRP()
            if hrp and hrp.ReceiveAge ~= 0 then
                pcall(function()
                    StruggleRemote:FireServer()
                    RagdollRemote:FireServer(hrp, 0)
                end)
            end
        else
            StopAntiGrab()
        end
    end
})

    --// GUCCI METHOD TOGGLE (links unter Anti Grab)
    local gucciStates = {
        TractorActive = false,
        BlobmanActive = false,
        Connections = {}
    }

    local function getCharacterData()
        local character = plr.Character or plr.CharacterAdded:Wait()
        local rootPart = character:WaitForChild("HumanoidRootPart", 5)
        local humanoid = character:WaitForChild("Humanoid", 5)
        return character, rootPart, humanoid
    end

    local function forceUnsit(humanoid)
        if not humanoid then return end
        for i = 1, 5 do
            humanoid.Sit = true
            task.wait()
            humanoid.Sit = false
        end
    end

    local function doGucciTractor()
        local blobb
        pcall(function()
            local pal, pal2
            pal2 = plr.PlayerGui.MenuGui.Menu.TabContents.ToyDestroy.Contents.ChildAdded:Connect(function(c)
                if c.Name == "TractorGreen" then
                    pal = c
                    task.wait()
                    pal2:Disconnect()
                    pal2 = nil
                end
            end)
            spawn(function()
                task.wait(0.1)
                if pal and pal.ViewItemButton then
                    local mess = pal.ViewItemButton.NewMessage:Clone()
                    mess.Name = "Gucci2"
                    mess.TextColor3 = Color3.fromRGB(255, 255, 255)
                    mess.Text = "Anti Gucci"
                    mess.Visible = true
                    mess.Parent = pal.ViewItemButton
                end
            end)
        end)
        blobb = spawntoy("TractorGreen", HRP.CFrame * CFrame.new(5, 5, 20))
        blobb.Name = "tractorgucci"
        repeat task.wait() until blobb
        blobb:WaitForChild("VehicleSeat", 2):Sit(plr.Character.Humanoid)
        task.spawn(function()
            for i = 1, 5 do
                Ragdoll:FireServer(HRP, 0)
                task.wait(0.05)
            end
        end)
        task.wait(0.05)
        while blobb.VehicleSeat.Occupant ~= plr.Character.Humanoid do
            task.wait()
        end
        plr.Character.Humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
        sno(blobb.Part)
        task.wait(0.05)
        blobb.VehicleSeat.CFrame = CFrame.new(0, 500000, 0)
        return blobb
    end

    local function doGucciBlobman()
        local blobb
        pcall(function()
            local pal, pal2
            pal2 = plr.PlayerGui.MenuGui.Menu.TabContents.ToyDestroy.Contents.ChildAdded:Connect(function(c)
                if c.Name == "CreatureBlobman" then
                    pal = c
                    task.wait()
                    pal2:Disconnect()
                    pal2 = nil
                end
            end)
            spawn(function()
                task.wait(0.1)
                if pal and pal.ViewItemButton then
                    local mess = pal.ViewItemButton.NewMessage:Clone()
                    mess.Name = "Gucci1"
                    mess.TextColor3 = Color3.fromRGB(255, 255, 255)
                    mess.Text = "Anti Gucci"
                    mess.Visible = true
                    mess.Parent = pal.ViewItemButton
                end
            end)
        end)
        blobb = spawntoy("CreatureBlobman", HRP.CFrame * CFrame.new(5, 5, 20))
        repeat task.wait() until blobb
        blobb:WaitForChild("VehicleSeat", 2):Sit(plr.Character.Humanoid)
        task.spawn(function()
            for i = 1, 5 do
                Ragdoll:FireServer(HRP, 0)
                task.wait(0.05)
            end
        end)
        task.wait(0.05)
        while blobb.VehicleSeat.Occupant ~= plr.Character.Humanoid do
            task.wait()
        end
        plr.Character.Humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
        task.wait(0.05)
        blobb.VehicleSeat.CFrame = CFrame.new(0, 500000, 0)
        return blobb
    end

    boxLeft:AddToggle("GucciMethod", {
        Text = "Gucci Method",
        Default = false,
        Callback = function(v)
            local selectedMethod = Options.GucciMethodType and Options.GucciMethodType.Value or "Tractor"
            
            if v then
                if selectedMethod == "Tractor" then
                    gucciStates.TractorActive = true
                    gucciStates.BlobmanActive = false
                    
                    local function spawnGucciTractor()
                        if not gucciStates.TractorActive then return end
                        
                        local char, rootPart, humanoid = getCharacterData()
                        if not rootPart or not humanoid then return end
                        
                        local oldPosition = rootPart.CFrame
                        
                        pcall(function()
                            local contents = plr.PlayerGui.MenuGui.Menu.TabContents.ToyDestroy.Contents
                            local connection
                            connection = contents.ChildAdded:Connect(function(c)
                                if c.Name == "TractorGreen" then
                                    connection:Disconnect()
                                    task.wait()
                                    if c:FindFirstChild("ViewItemButton") then
                                        local mess = c.ViewItemButton.NewMessage:Clone()
                                        mess.Name = "Gucci2"
                                        mess.TextColor3 = Color3.fromRGB(255, 255, 255)
                                        mess.Text = "Anti Gucci"
                                        mess.Visible = true
                                        mess.Parent = c.ViewItemButton
                                    end
                                end
                            end)
                        end)
                        
                        if inv then
                            for _, item in ipairs(inv:GetChildren()) do
                                if item.Name == "tractorgucci" then
                                    DestroyToy:FireServer(item)
                                end
                            end
                        end
                        
                        local blobb = spawntoy("TractorGreen", rootPart.CFrame * CFrame.new(5, 5, 20))
                        if not blobb then return end
                        blobb.Name = "tractorgucci"
                        
                        local vehicleSeat = blobb:WaitForChild("VehicleSeat", 2)
                        if vehicleSeat then
                            vehicleSeat:Sit(humanoid)
                        end
                        
                        task.spawn(function()
                            local endTime = tick() + 2.5
                            while tick() < endTime and gucciStates.TractorActive do
                                if rootPart and rootPart.Parent then
                                    Ragdoll:FireServer(rootPart, 0)
                                end
                                task.wait()
                            end
                        end)
                        
                        if vehicleSeat and vehicleSeat.Occupant ~= humanoid then
                            repeat task.wait() until not blobb or not blobb.Parent or vehicleSeat.Occupant == humanoid
                        end
                        
                        if humanoid then
                            humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
                        end
                        
                        if blobb:FindFirstChild("Part") then
                            sno(blobb.Part)
                        end
                        task.wait()
                        
                        if blobb and vehicleSeat then
                            vehicleSeat.CFrame = CFrame.new(0, 500000, 0)
                        end

                        if rootPart and rootPart.Parent then
                            rootPart.CFrame = oldPosition
                        end
                        
                        if gucciStates.Connections["tractor_death"] then gucciStates.Connections["tractor_death"]:Disconnect() end
                        gucciStates.Connections["tractor_death"] = humanoid.Died:Connect(function()
                            gucciStates.Connections["tractor_death"]:Disconnect()
                            if blobb and blobb.Parent then
                                pcall(function() DestroyToy:FireServer(blobb) end)
                            end
                            task.wait(0.5)
                            if gucciStates.TractorActive then
                                spawnGucciTractor()
                            end
                        end)
                    end
                    
                    spawnGucciTractor()
                    
                elseif selectedMethod == "Blobman" then
                    gucciStates.TractorActive = false
                    gucciStates.BlobmanActive = true
                    
                    local isRunning = false
                    
                    local function gucci()
                        if not gucciStates.BlobmanActive or isRunning then return end
                        isRunning = true
                        
                        local char, rootPart, humanoid = getCharacterData()
                        if not rootPart or not humanoid then 
                            isRunning = false 
                            return 
                        end
                        
                        local oldPosition = rootPart.CFrame
                        
                        while plr:FindFirstChild("IsHeld") and plr.IsHeld.Value == true do
                            if not gucciStates.BlobmanActive then isRunning = false; return end
                            task.wait()
                        end
                        
                        humanoid.Sit = true
                        task.wait()
                        humanoid.Sit = false
                        
                        pcall(function()
                            local contents = plr.PlayerGui.MenuGui.Menu.TabContents.ToyDestroy.Contents
                            if gucciStates.Connections["autogucci_child"] then gucciStates.Connections["autogucci_child"]:Disconnect() end
                            
                            gucciStates.Connections["autogucci_child"] = contents.ChildAdded:Connect(function(c)
                                if c.Name == "CreatureBlobman" then
                                    gucciStates.Connections["autogucci_child"]:Disconnect()
                                    local viewBtn = c:WaitForChild("ViewItemButton", 1)
                                    if viewBtn and viewBtn:FindFirstChild("NewMessage") then
                                        local mess = viewBtn.NewMessage:Clone()
                                        mess.Name = "Gucci1"
                                        mess.TextColor3 = Color3.fromRGB(255, 255, 255)
                                        mess.Text = "Anti Gucci"
                                        mess.Visible = true
                                        mess.Parent = viewBtn
                                    end
                                end
                            end)
                        end)
                        
                        if inv then
                            for _, item in ipairs(inv:GetChildren()) do
                                if item.Name == "autogucci" then
                                    pcall(function() DestroyToy:FireServer(item) end)
                                end
                            end
                        end
                        
                        local blobb = spawntoy("CreatureBlobman", rootPart.CFrame * CFrame.new(5, 5, 20))
                        if not blobb then isRunning = false; return end
                        blobb.Name = "autogucci"
                        
                        local vehicleSeat = blobb:WaitForChild("VehicleSeat", 2)
                        if vehicleSeat then
                            vehicleSeat:Sit(humanoid)
                        end
                        
                        task.spawn(function()
                            local endTime = tick() + 2.5
                            while tick() < endTime and gucciStates.BlobmanActive and rootPart and rootPart.Parent do
                                Ragdoll:FireServer(rootPart, 0)
                                task.wait()
                            end
                        end)
                        
                        for _, key in ipairs({"autogucci_death", "autogucci_destroy"}) do
                            if gucciStates.Connections[key] then
                                gucciStates.Connections[key]:Disconnect()
                                gucciStates.Connections[key] = nil
                            end
                        end
                        
                        gucciStates.Connections["autogucci_death"] = humanoid.Died:Connect(function()
                            for _, key in ipairs({"autogucci_death", "autogucci_destroy", "autogucci_child"}) do
                                if gucciStates.Connections[key] then
                                    gucciStates.Connections[key]:Disconnect()
                                    gucciStates.Connections[key] = nil
                                end
                            end
                            if blobb and blobb.Parent then
                                pcall(function() DestroyToy:FireServer(blobb) end)
                            end
                            task.wait(0.01)
                            isRunning = false
                            if gucciStates.BlobmanActive then gucci() end
                        end)
                        
                        gucciStates.Connections["autogucci_destroy"] = blobb.Destroying:Connect(function()
                            for _, key in ipairs({"autogucci_death", "autogucci_destroy", "autogucci_child"}) do
                                if gucciStates.Connections[key] then
                                    gucciStates.Connections[key]:Disconnect()
                                    gucciStates.Connections[key] = nil
                                end
                            end
                            isRunning = false
                            if gucciStates.BlobmanActive then gucci() end
                        end)
                        
                        if vehicleSeat and vehicleSeat.Occupant ~= humanoid then
                            local timeout = tick() + 2
                            repeat task.wait() until not blobb or vehicleSeat.Occupant == humanoid or tick() > timeout
                        end
                        
                        if humanoid then
                            humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
                        end
                        task.wait()
                        
                        if blobb and blobb:FindFirstChild("RightDetector") then
                            sno(blobb.RightDetector)
                        end
                        
                        if blobb and vehicleSeat then
                            vehicleSeat.CFrame = CFrame.new(0, 500000, 0)
                        end
                        
                        if rootPart and rootPart.Parent then
                            rootPart.CFrame = oldPosition
                        end
                        
                        isRunning = false
                    end
                    
                    task.spawn(function()
                        while gucciStates.BlobmanActive do
                            local char, rootPart, humanoid = getCharacterData()
                            local isDead = not char or not char.Parent or (humanoid and humanoid:GetState() == Enum.HumanoidStateType.Dead)
                            local noToy = inv and not inv:FindFirstChild("autogucci")
                            local isHeld = plr:FindFirstChild("IsHeld") and plr.IsHeld.Value
                            
                            if isDead or noToy or isHeld then
                                gucci()
                            end
                            task.wait(0.015)
                        end
                    end)
                end
            else
                -- Deaktivierung
                gucciStates.TractorActive = false
                gucciStates.BlobmanActive = false
                
                for key, conn in pairs(gucciStates.Connections) do
                    if conn then conn:Disconnect() end
                end
                gucciStates.Connections = {}
                
                if inv then
                    for _, item in ipairs(inv:GetChildren()) do
                        if item.Name == "tractorgucci" or item.Name == "autogucci" then
                            pcall(function() DestroyToy:FireServer(item) end)
                        end
                    end
                end
                
                local _, _, humanoid = getCharacterData()
                forceUnsit(humanoid)
            end
        end
    })

    -- Rest der Antis-Box...
    boxLeft:AddToggle("AntiBlobman", {
        Text = "Anti Blobman",
        Default = false,
        Callback = function(v)
            if v then
                for i, v in pairs(workspace:GetDescendants()) do
                    if v.Name == "CreatureBlobman" and not v:IsDescendantOf(inv) then
                        local rd, ld = v:FindFirstChild("RightDetector") or v:WaitForChild("RightDetector", 3), v:FindFirstChild("LeftDetector") or v:WaitForChild("LeftDetector", 3)
                        if rd and ld then
                            rd.RightAlignOrientation.Enabled = false
                            rd.RightWeld.Enabled = false
                            ld.LeftAlignOrientation.Enabled = false
                            ld.LeftWeld.Enabled = false
                        end
                    end
                end
                cons["antiblob"] = workspace.DescendantAdded:Connect(function(d)
                    if d.Name == "CreatureBlobman" and (not inv or not d:IsDescendantOf(inv)) then
                        local rd = d:FindFirstChild("RightDetector") or d:WaitForChild("RightDetector", 3)
                        local ld = d:FindFirstChild("LeftDetector") or d:WaitForChild("LeftDetector", 3)
                        if rd and ld then
                            local rao = rd:WaitForChild("RightAlignOrientation", 1)
                            local rw  = rd:WaitForChild("RightWeld", 1)
                            local lao = ld:WaitForChild("LeftAlignOrientation", 1)
                            local lw  = ld:WaitForChild("LeftWeld", 1)
                            if rao then rao.Enabled = false end
                            if rw  then rw.Enabled  = false end
                            if lao then lao.Enabled = false end
                            if lw  then lw.Enabled  = false end
                        end
                    end
                end)
            else
                if cons["antiblob"] then
                    cons["antiblob"]:Disconnect()
                end
            end
        end
    })

    boxLeft:AddToggle("AntiExplode", {
        Text = "Anti Explosion",
        Default = false,
        Callback = function(v)
            if v then
                cons["antiexp"] = workspace.ChildAdded:Connect(function(c)
                    if c.Name == "Part" then
                        if (c.Position - HRP.Position).Magnitude < 40 and plr.Character.Humanoid.Ragdolled.Value == true then
                            HRP.Anchored = true
                            task.wait(0.01)
                            HRP.Anchored = false
                            stvel(HRP)
                            hum:ChangeState(Enum.HumanoidStateType.Running)
                        end
                    end
                end)
            else
                if cons["antiexp"] then
                    cons["antiexp"]:Disconnect()
                end
            end
        end
    })

    boxLeft:AddToggle("AntiBurn", {
        Text = "Anti Burn",
        Default = false,
        Callback = function(v)
            if v then
                antiburn1 = plr.CharacterAdded:Connect(function(ch)
                    if antiburn then
                        antiburn:Disconnect()
                    end
                    antiburn = ch:WaitForChild("Humanoid", 0.5).FireDebounce.Changed:Connect(function()
                        if ch:WaitForChild("Humanoid", 0.5).FireDebounce.Value == true then
                            local bar = workspace.Plots.Plot1.Barrier.PlotBarrier
                            local pos = bar.CFrame
                            task.spawn(function()
                                repeat task.wait() bar.CFrame = HRP.CFrame until not hum.FireDebounce.Value
                            end)
                            task.wait(1)
                            ch:WaitForChild("Humanoid", 0.5).FireDebounce.Value = false
                            task.wait()
                            bar.CFrame = pos
                        end
                    end)
                end)
                antiburn = plr.Character.Humanoid.FireDebounce.Changed:Connect(function()
                    if plr.Character.Humanoid.FireDebounce.Value == true then
                        local bar = workspace.Plots.Plot1.Barrier.PlotBarrier
                        local pos = bar.CFrame
                        task.spawn(function()
                            repeat task.wait() bar.CFrame = HRP.CFrame until not hum.FireDebounce.Value
                        end)
                        task.wait(1)
                        plr.Character.Humanoid.FireDebounce.Value = false
                        task.wait()
                        bar.CFrame = pos
                    end
                end)
            else
                if antiburn then antiburn:Disconnect() end
                if antiburn1 then antiburn1:Disconnect() end
            end
        end
    })

    boxLeft:AddToggle("AntiVoid", {
        Text = "Anti Void",
        Default = false,
        Callback = function(v)
            if v then
                workspace.FallenPartsDestroyHeight = 0 / 0
            else
                workspace.FallenPartsDestroyHeight = -100
            end
        end
    })

    --// ANTI NET OWNER (SAFE RESPAWN VERSION)
    local spawnToyActive = false
    local currentSpawnedToy = nil
    local antiNetThread = nil
    local currentDelay = 0.03
    local respawnCooldown = false

    boxLeft:AddToggle("SpawnToy", {
        Text = "Anti Net owner",
        Default = false,

        Callback = function(v)
            spawnToyActive = v

            local function cleanupToy()
                if currentSpawnedToy then
                    pcall(function()
                        if currentSpawnedToy.Parent then
                            if DestroyToy then
                                DestroyToy:FireServer(currentSpawnedToy)
                            end
                            currentSpawnedToy:Destroy()
                        end
                    end)
                end
                currentSpawnedToy = nil
            end

            local function findToy()
                local selectedToy = Options.SpawnToyType and Options.SpawnToyType.Value or "Coconut"
                local expectedName = "SpawnedToy_" .. selectedToy

                if currentSpawnedToy
                    and currentSpawnedToy.Parent
                    and currentSpawnedToy:IsDescendantOf(workspace)
                then
                    local holdPart = currentSpawnedToy:FindFirstChild("HoldPart")
                    if holdPart then
                        return currentSpawnedToy
                    end
                end

                for _, obj in ipairs(workspace:GetDescendants()) do
                    if obj.Name == expectedName then
                        local holdPart = obj:FindFirstChild("HoldPart")
                        if holdPart then
                            currentSpawnedToy = obj
                            return obj
                        end
                    end
                end

                return nil
            end

            local function spawnToySafe()
                if respawnCooldown then
                    return nil
                end

                respawnCooldown = true
                task.delay(0.5, function()
                    respawnCooldown = false
                end)

                cleanupToy()

                local selectedToy = Options.SpawnToyType and Options.SpawnToyType.Value or "Coconut"
                local realToyName = ToyList[selectedToy]

                if not realToyName then
                    return nil
                end

                local char = plr.Character
                local hrp = char and char:FindFirstChild("HumanoidRootPart")

                if not hrp then
                    return nil
                end

                local success, toy = pcall(function()
                    return spawntoy(
                        realToyName,
                        hrp.CFrame * CFrame.new(0, 5, 10)
                    )
                end)

                if success and toy and toy.Parent then
                    toy.Name = "SpawnedToy_" .. selectedToy

                    local timeout = tick() + 3
                    repeat
                        task.wait(0.1)
                    until toy:FindFirstChild("HoldPart") or tick() > timeout

                    if toy:FindFirstChild("HoldPart") then
                        currentSpawnedToy = toy
                        print("[ANTI NET] Toy erfolgreich gespawnt")
                        return toy
                    end
                end

                print("[ANTI NET] Spawn fehlgeschlagen")
                return nil
            end

            if v then
                local threadId = tick()
                antiNetThread = threadId

                task.spawn(function()
                    while spawnToyActive and antiNetThread == threadId do
                        currentDelay =
                            Options.AntiNetOwnerDelay
                            and Options.AntiNetOwnerDelay.Value
                            or 0.03

                        local char = plr.Character
                        local hrp = char and char:FindFirstChild("HumanoidRootPart")

                        if not (char and hrp) then
                            task.wait(1)
                            continue
                        end

                        local toy = findToy()

                        if not toy then
                            print("[ANTI NET] Toy fehlt -> respawn")
                            toy = spawnToySafe()

                            if not toy then
                                task.wait(1)
                                continue
                            end
                        end

                        currentSpawnedToy = toy

                        local holdPart = toy:FindFirstChild("HoldPart")

                        if not holdPart then
                            print("[ANTI NET] HoldPart fehlt -> respawn")
                            cleanupToy()
                            task.wait(0.2)
                            continue
                        end

                        local dropRemote =
                            holdPart:FindFirstChild("DropItemRemoteFunction")

                        local holdRemote =
                            holdPart:FindFirstChild("HoldItemRemoteFunction")

                        if not toy.Parent
                            or not toy:IsDescendantOf(workspace)
                        then
                            currentSpawnedToy = nil
                            task.wait(0.1)
                            continue
                        end

                        pcall(function()
                            if dropRemote then
                                local highCF =
                                    hrp.CFrame * CFrame.new(0, 1000000, 0)

                                dropRemote:InvokeServer(
                                    toy,
                                    highCF,
                                    Vector3.zero
                                )
                            end
                        end)

                        task.wait(currentDelay)

                        if not toy.Parent
                            or not toy:IsDescendantOf(workspace)
                        then
                            currentSpawnedToy = nil
                            continue
                        end

                        pcall(function()
                            if holdRemote then
                                holdRemote:InvokeServer(toy, char)
                            end
                        end)

                        task.wait(currentDelay)
                    end
                end)

            else
                antiNetThread = nil
                cleanupToy()
            end
        end
    })

    boxLeft:AddToggle("NuggetAntiKick", {
    Text = "Nugget Anti Kick",
    Default = false,

    Callback = function(Value)
        _G.NuggetAntiKick = Value

        local plr = game.Players.LocalPlayer
        local RS = game:GetService("ReplicatedStorage")

        local spawnRemote = RS.MenuToys.SpawnToyRemoteFunction
        local destroyrem = RS.MenuToys.DestroyToy
        local setOwner = RS:WaitForChild("GrabEvents"):WaitForChild("SetNetworkOwner")
        local canSpawn = plr:WaitForChild("CanSpawnToy")

        local lastSpawn = 0

        local function getChar()
            return plr.Character or plr.CharacterAdded:Wait()
        end

        local function getHRP()
            return getChar():WaitForChild("HumanoidRootPart")
        end

        local function ClearNugget()
            local inv = workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
            if not inv then return end

            for _, v in pairs(inv:GetChildren()) do
                if v.Name == "AntiKick" then
                    pcall(function()
                        destroyrem:FireServer(v)
                    end)
                end
            end
        end

        local function SpawnNugget()
            while not canSpawn.Value do
                if not _G.NuggetAntiKick then return nil end
                task.wait()
            end

            local hrp = getHRP()

            pcall(function()
                spawnRemote:InvokeServer(
                    "MineralIngotGold",
                    hrp.CFrame * CFrame.new(0, 5, 0),
                    Vector3.new()
                )
            end)

            local inv = workspace:WaitForChild(plr.Name .. "SpawnedInToys", 2)
            if inv then
                local nugget = inv:WaitForChild("MineralIngotGold", 2)
                if nugget then
                    nugget.Name = "AntiKick"
                end
                return nugget
            end
        end

        local function AttachNugget(nugget)
            if not nugget then return end

            local hrp = getHRP()
            local nuggetPrimary = nugget:FindFirstChildWhichIsA("BasePart")

            if not nuggetPrimary then
                for _, p in pairs(nugget:GetDescendants()) do
                    if p:IsA("BasePart") then
                        nuggetPrimary = p
                        break
                    end
                end
            end

            if not nuggetPrimary then return end

            -- Nugget in Character verschieben (wichtig für WeldConstraint!)
            nugget.Parent = plr.Character

            for _, part in pairs(nugget:GetDescendants()) do
                if part:IsA("BasePart") then
                    part.CanCollide = false
                    part.Massless = true
                    part.Transparency = 0

                    -- Network Owner
                    pcall(function()
                        setOwner:FireServer(part, part.CFrame)
                    end)

                    -- WELD CONSTRAINT zum HRP
                    local weld = Instance.new("WeldConstraint")
                    weld.Part0 = hrp
                    weld.Part1 = part
                    weld.Parent = hrp
                end
            end

            -- Position relativ zum HRP setzen
            nuggetPrimary.CFrame = hrp.CFrame * CFrame.new(2, 0.5, 0)

            lastSpawn = tick()
        end

        if Value then
            task.spawn(function()
                while _G.NuggetAntiKick do
                    task.wait(0.1)

                    local char = plr.Character
                    if not char then continue end

                    local hum = char:FindFirstChild("Humanoid")
                    if not hum or hum.Health <= 0 then continue end

                    local inv = workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
                    local nugget = inv and inv:FindFirstChild("AntiKick")

                    if not nugget then
                        nugget = SpawnNugget()
                        if nugget then
                            AttachNugget(nugget)
                        end
                    end

                    if nugget then
                        local hrp = getHRP()

                        if tick() - lastSpawn > 1 then
                            local nuggetPrimary = nugget:FindFirstChildWhichIsA("BasePart")
                            if nuggetPrimary then
                                local dist = (hrp.Position - nuggetPrimary.Position).Magnitude
                                if dist > 25 then
                                    ClearNugget()
                                end
                            end
                        end
                    end
                end
            end)
        else
            _G.NuggetAntiKick = false
            ClearNugget()
        end
    end
})


    boxLeft:AddToggle("AntiKick", {
    Name = "Anti Kick",
    CurrentValue = false,
    Flag = "AntiKickToggle",
    Callback = function(Value)
        getgenv().AntiKickEnabled = Value
        
        if Value then
            task.spawn(function()
                local plr = game.Players.LocalPlayer
                local inv = workspace[plr.Name.."SpawnedInToys"]
                local hrp

                local setOwner = game.ReplicatedStorage:WaitForChild("GrabEvents"):WaitForChild("SetNetworkOwner")
                local stickyEvent = game.ReplicatedStorage:WaitForChild("PlayerEvents"):WaitForChild("StickyPartEvent")
                local destroyrem = game.ReplicatedStorage:WaitForChild("MenuToys"):WaitForChild("DestroyToy")
                local canSpawn = plr:WaitForChild("CanSpawnToy")

                local function getHRP()
                    if plr.Character and plr.Character:FindFirstChild("HumanoidRootPart") then
                        return plr.Character.HumanoidRootPart
                    else
                        local character = plr.CharacterAdded:Wait()
                        return character:WaitForChild("HumanoidRootPart")
                    end
                end

                local function CheckForHome()
                    local ToyFolder
                    if not workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) then 
                        return false
                    end
                    for _, v in pairs(workspace.Plots:GetChildren()) do
                        for _, b in pairs(v.PlotSign.ThisPlotsOwners:GetChildren()) do
                            if b.Value == plr.Name then
                                ToyFolder = workspace.PlotItems[v.Name]
                            end
                        end
                    end
                    if ToyFolder then 
                        return true, ToyFolder
                    else 
                        return false
                    end
                end

                local function StickKunai(kunai)
                    if not kunai or not kunai:FindFirstChild("StickyPart") then return end

                    local currentHRP = getHRP()
                    
                    if kunai:FindFirstChild("SoundPart") then
                        if not kunai["SoundPart"]:FindFirstChild("PartOwner") or kunai["SoundPart"].PartOwner.Value ~= plr.Name then 
                            setOwner:FireServer(kunai.SoundPart, kunai.SoundPart.CFrame)
                        end
                    end
                    
                    stickyEvent:FireServer(
                        kunai.StickyPart,
                        currentHRP:FindFirstChild("FirePlayerPart") or currentHRP:WaitForChild("FirePlayerPart"),
                        CFrame.new(0,0,0) * CFrame.Angles(0,math.rad(90),math.rad(90))
                    )
                    
                    for _, obj in pairs(kunai:GetChildren()) do
                        if obj.Name == "Pyramid" then
                            obj.CanTouch = false
                            obj.CanCollide = false
                            obj.CanQuery = false
                            obj.Transparency = 0
                            local high = Instance.new("Highlight")
                            high.FillColor = Color3.fromRGB(0, 0, 0)
                            high.Parent = obj

                        elseif obj.Name == "Main" then
                            obj.CanTouch = false
                            obj.CanCollide = false
                            obj.CanQuery = false
                            obj.Transparency = 0
                            local high = Instance.new("Highlight")
                            high.FillColor = Color3.fromRGB(255, 255, 255)
                            high.Parent = obj

                        elseif obj:IsA("BasePart") then
                            obj.CanTouch = false
                            obj.CanCollide = false
                            obj.CanQuery = false
                            obj.Transparency = 1
                        end
                    end
                end

                local function ClearKunai()
                    for _,v in pairs(inv:GetChildren()) do
                        if v.Name == "AntiKick" then
                            destroyrem:FireServer(v)
                        end
                    end
                end

                local function SpawnToy(name)
                    while not canSpawn.Value do
                        canSpawn.Changed:Wait()
                    end

                    local currentHRP = getHRP()
                    
                    task.spawn(function()
                        game.ReplicatedStorage.MenuToys.SpawnToyRemoteFunction:InvokeServer(
                            name,
                            currentHRP.CFrame * CFrame.new(0, 12, 20),
                            Vector3.new(0,0,0)
                        )
                    end)
                    
                    local boolik, house = CheckForHome()
                    if boolik then 
                        return house:WaitForChild(name, 2)
                    elseif not workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) then 
                        return inv:WaitForChild(name, 2)
                    elseif workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) and not boolik then 
                        return nil
                    end
                end

                while getgenv().AntiKickEnabled do 
                    task.wait(0.005)

                    if not plr.Character or not plr.Character:FindFirstChild("Humanoid") or plr.Character.Humanoid.Health <= 0 then 
                        continue 
                    end
                    
                    local kunai = inv:FindFirstChild("NinjaShuriken")
                    
                    if workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) then 
                        local boolik, house = CheckForHome()
                        if boolik and house and workspace.Plots:FindFirstChild(house.Name) and workspace.Plots:FindFirstChild(house.Name)["PlotSign"]["ThisPlotsOwners"]:FindFirstChild("Value") and workspace.Plots:FindFirstChild(house.Name)["PlotSign"]["ThisPlotsOwners"]["Value"]["TimeRemainingNum"].Value > 89 then 
                            kunai = SpawnToy("NinjaShuriken")
                            if kunai == nil then continue end
                            kunai.Name = "AntiKick" 
                            StickKunai(kunai)
                        end
                    end
                    
                    if not kunai then
                        if workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) then continue end 
                        kunai = SpawnToy("NinjaShuriken")
                        if kunai == nil then continue end 
                        kunai.Name = "AntiKick"
                        if not kunai then continue end 
                    end
                    
                    repeat
                        if kunai and kunai:FindFirstChild("StickyPart") and kunai.StickyPart.CanTouch == true then
                            StickKunai(kunai)
                            kunai.Name = "AntiKick"
                        end
                        wait(0.3)
                    until not kunai or not getgenv().AntiKickEnabled 
                        or not kunai:FindFirstChild("StickyPart")
                        or kunai.StickyPart.CanTouch == false 
                        or not plr.Character or not plr.Character:FindFirstChild("HumanoidRootPart") 
                        or not kunai:FindFirstChild("StickyPart") 
                        or (plr.Character.HumanoidRootPart.Position - kunai.StickyPart.Position).Magnitude >= 20

                    if not kunai or not kunai:FindFirstChild("StickyPart") or not plr.Character or not plr.Character:FindFirstChild("HumanoidRootPart") or (plr.Character.HumanoidRootPart.Position - kunai.StickyPart.Position).Magnitude >= 20 then 
                        ClearKunai()
                    end 
                    
                    pcall(function()
                        repeat
                            wait(0.05)
                        until not getgenv().AntiKickEnabled or not plr.Character or not plr.Character:FindFirstChild("Humanoid") or not kunai or not kunai:FindFirstChild("StickyPart") or not kunai.StickyPart:FindFirstChild("StickyWeld") or not kunai.StickyPart.StickyWeld.Part1
                        
                        if not kunai or not kunai:FindFirstChild("StickyPart") or (plr.Character and plr.Character:FindFirstChild("Humanoid") and plr.Character.Humanoid.Health <= 0) or not kunai["StickyPart"]:FindFirstChild("StickyWeld").Part1 then 
                            ClearKunai()
                        end
                    end)
                end
            end)
        end
    end,
})


    local doubleResetConnection = nil
    local deathTrackerConnection = nil
    local isProcessing = false
    local deathCounter = 0
    local lastCharacter = nil
    local lastHealth = 100
    local healthTrackerConnection = nil
    local ancestryConnection = nil
    local resetCooldown = false

    boxLeft:AddToggle("PCLDbreak", {
        Text = "PCLD break",
        Default = false,

        Callback = function(Value)
            pcldActive = Value

            if not Value then
                if doubleResetConnection then
                    doubleResetConnection:Disconnect()
                    doubleResetConnection = nil
                end
                if deathTrackerConnection then
                    deathTrackerConnection:Disconnect()
                    deathTrackerConnection = nil
                end
                if healthTrackerConnection then
                    healthTrackerConnection:Disconnect()
                    healthTrackerConnection = nil
                end
                if ancestryConnection then
                    ancestryConnection:Disconnect()
                    ancestryConnection = nil
                end
                isProcessing = false
                resetCooldown = false
                deathCounter = 0
                lastCharacter = nil
                lastHealth = 100
                return
            end

            local function disableFTAPScripts()
                pcall(function()
                    local playerScripts = game.Players.LocalPlayer:FindFirstChild("PlayerScripts")
                    if playerScripts then
                        local beamMove = playerScripts:FindFirstChild("CharacterAndBeamMove")
                        if beamMove then
                            beamMove.Disabled = true
                        end
                    end
                end)
            end

            local function forceKill()
                local char = game.Players.LocalPlayer.Character
                if char then
                    local hum = char:FindFirstChild("Humanoid")
                    if hum then
                        for i = 1, 30 do
                            pcall(function() hum.Health = 0 end)
                            task.wait()
                        end
                    end
                end
            end

            local function performDoubleReset()
                if isProcessing then return end
                
                isProcessing = true
                resetCooldown = true
                print("=== DOUBLE RESET START ===")
                
                print("Double Reset - Tod #1")
                disableFTAPScripts()
                forceKill()
                
                local startTime = tick()
                repeat
                    task.wait(0.1)
                    if tick() - startTime > 5 then break end
                until game.Players.LocalPlayer.Character and 
                      game.Players.LocalPlayer.Character:FindFirstChild("Humanoid") and
                      game.Players.LocalPlayer.Character.Humanoid.Health > 0
                
                task.wait(0.1)
                print("Double Reset - Tod #2")
                disableFTAPScripts()
                forceKill()
                
                startTime = tick()
                repeat
                    task.wait(0.1)
                    if tick() - startTime > 5 then break end
                until game.Players.LocalPlayer.Character and 
                      game.Players.LocalPlayer.Character:FindFirstChild("Humanoid") and
                      game.Players.LocalPlayer.Character.Humanoid.Health > 0
                
                print("=== DOUBLE RESET KOMPLETT ===")
                
                deathCounter = 2
                print("Counter auf 2 gesetzt.")
                
                task.wait(1.5)
                resetCooldown = false
                print("Cooldown vorbei. Bereit für echte Tode.")
                
                isProcessing = false
                
                if game.Players.LocalPlayer.Character then
                    setupDeathTracker(game.Players.LocalPlayer.Character)
                end
            end

            local function performSingleReset()
                if isProcessing then return end
                
                isProcessing = true
                resetCooldown = true
                print("=== SINGLE RESET START (3. Tod erkannt) ===")
                
                print("Single Reset - Tod")
                disableFTAPScripts()
                forceKill()
                
                local startTime = tick()
                repeat
                    task.wait(0.1)
                    if tick() - startTime > 5 then break end
                until game.Players.LocalPlayer.Character and 
                      game.Players.LocalPlayer.Character:FindFirstChild("Humanoid") and
                      game.Players.LocalPlayer.Character.Humanoid.Health > 0
                
                print("=== SINGLE RESET KOMPLETT ===")
                
                deathCounter = 2
                print("Counter auf 2 gesetzt. Nächster echte Tod triggert wieder Single Reset...")
                
                task.wait(1.5)
                resetCooldown = false
                print("Cooldown vorbei.")
                
                isProcessing = false
                
                if game.Players.LocalPlayer.Character then
                    setupDeathTracker(game.Players.LocalPlayer.Character)
                end
            end

            local function onDeathDetected(reason)
                if not pcldActive then return end
                if isProcessing then
                    print("Tod während Reset - ignoriert")
                    return
                end
                if resetCooldown then
                    print("Tod während Cooldown - ignoriert (" .. tostring(reason) .. ")")
                    return
                end
                
                deathCounter = deathCounter + 1
                print("Tod erkannt! Grund: " .. tostring(reason) .. " | Counter: " .. deathCounter .. "/3")
                
                if deathCounter >= 3 then
                    print("3 Tode erreicht! Starte Single Reset...")
                    task.spawn(performSingleReset)
                end
            end

            local function setupDeathTracker(character)
                if not character or not pcldActive then return end
                
                if healthTrackerConnection then
                    healthTrackerConnection:Disconnect()
                    healthTrackerConnection = nil
                end
                if ancestryConnection then
                    ancestryConnection:Disconnect()
                    ancestryConnection = nil
                end
                
                lastCharacter = character
                lastHealth = 100
                
                local hum = character:WaitForChild("Humanoid", 5)
                if not hum then return end
                
                lastHealth = hum.Health
                
                hum.Died:Connect(function()
                    onDeathDetected("Humanoid.Died")
                end)
                
                healthTrackerConnection = hum:GetPropertyChangedSignal("Health"):Connect(function()
                    if not pcldActive or isProcessing or resetCooldown then return end
                    local currentHealth = hum.Health
                    if currentHealth <= 0 and lastHealth > 0 then
                        onDeathDetected("Health = 0")
                    end
                    lastHealth = currentHealth
                end)
                
                ancestryConnection = character.AncestryChanged:Connect(function(_, parent)
                    if not pcldActive or isProcessing or resetCooldown then return end
                    if parent == nil and lastCharacter == character then
                        task.delay(0.2, function()
                            if pcldActive and not isProcessing and not resetCooldown then
                                onDeathDetected("Charakter zerstört")
                            end
                        end)
                    end
                end)
            end

            deathTrackerConnection = game.Players.LocalPlayer.CharacterAdded:Connect(function(character)
                if not pcldActive then return end
                
                if resetCooldown or isProcessing then
                    print("CharacterAdded während Cooldown/Processing - ignoriert")
                    task.wait(0.5)
                    setupDeathTracker(character)
                    return
                end
                
                if lastCharacter and lastCharacter ~= character then
                    task.delay(0.3, function()
                        if pcldActive and not isProcessing and not resetCooldown then
                            onDeathDetected("Neuer Charakter")
                        end
                    end)
                end
                
                task.wait(0.5)
                setupDeathTracker(character)
            end)

            if game.Players.LocalPlayer.Character then
                setupDeathTracker(game.Players.LocalPlayer.Character)
            end

            deathCounter = 0
            task.spawn(performDoubleReset)

            doubleResetConnection = game.Players.LocalPlayer.CharacterAdded:Connect(function(char)
                if not pcldActive then return end
                task.wait(0.3)
                disableFTAPScripts()
            end)
        end
    })

    boxLeft:AddToggle("AntiSticky", {
        Text = "Anti Sticky",
        Default = false,
        Callback = function(v)
            plr.PlayerScripts.StickyPartsTouchDetection.Enabled = not v
        end
    })

    boxLeft:AddToggle("antilag", {
    Name = "Anti Lag",
    Default = false,
    Callback = function(Value)
        local characterScript = LocalPlayer.PlayerScripts:FindFirstChild("CharacterAndBeamMove")
        if characterScript then
            characterScript.Disabled = Value
        end
    end
})

local lagger = nil
local autoAntiLagEnabled = true -- Globaler State, immer true

boxLeft:AddToggle("AutoAntiLag", {
    Text = "Auto Anti Lag",
    Default = true, -- Von Anfang an aktiviert
    Callback = function(v)
        autoAntiLagEnabled = v
        if v then
            task.spawn(function()
                while autoAntiLagEnabled and task.wait() do
                    if Lines > 100 then
                        plr.PlayerScripts.CharacterAndBeamMove.Enabled = false
                        Library:Notify({
                            Title = "Auto Anti Lag Notify",
                            Description = (lagger and lagger.Name or "Someone") .. " Lagged Server",
                            Time = 6.5,
                        })
                        Lines = 0
                    end
                end
            end)
        else
            plr.PlayerScripts.CharacterAndBeamMove.Enabled = true
        end
    end
})

-- GrabBeam Tracker
workspace.DescendantAdded:Connect(function(d)
    if d.Name == "GrabBeam" then
        Lines += 1
        local success, result = pcall(function()
            return d.Parent.Parent.Parent
        end)
        if success and result and result:IsA("Player") then
            lagger = result
        end
    end
end)

-- Sofort nach UI-Erstellung aktivieren
task.spawn(function()
    task.wait(0.5) -- Kurz warten bis UI geladen ist
    
    -- Toggle aktivieren falls noch nicht
    if Toggles.AutoAntiLag and not Toggles.AutoAntiLag.Value then
        Toggles.AutoAntiLag:SetValue(true)
    end
end)

-- Nach Respawn wieder aktivieren
plr.CharacterAdded:Connect(function()
    task.wait(1)
    if Toggles.AutoAntiLag and not Toggles.AutoAntiLag.Value then
        Toggles.AutoAntiLag:SetValue(true)
    end
end)


    boxLeft:AddToggle("AntiLoop", {
        Text = "Anti Loop",
        Default = false,
        Callback = function(v)
            if cons["antiloop"] then
                cons["antiloop"]:Disconnect()
                cons["antiloop"] = nil
            end

            if v then
                cons["antiloop"] = plr.CharacterAdded:Connect(function(char)
                    task.defer(function()
                        local hrp = char:WaitForChild("HumanoidRootPart", 5)
                        local hum = char:WaitForChild("Humanoid", 5)
                        if not hrp or not hum then return end

                        local safeCFrame = CFrame.new(524.703979, 93.712005, -375.040985)
                        local startTime = os.clock()
                        
                        while os.clock() - startTime < 2.0 do
                            if not char.Parent or not hrp.Parent or hum.Health == 0 or not Toggles.AntiLoop.Value then 
                                break 
                            end
                            
                            hrp.CFrame = safeCFrame
                            hrp.AssemblyLinearVelocity = Vector3.zero
                            hrp.AssemblyAngularVelocity = Vector3.zero
                            
                            game:GetService("RunService").Heartbeat:Wait()
                        end
                    end)
                end)
                
                if plr.Character and plr.Character:FindFirstChild("HumanoidRootPart") then
                    pcall(function()
                        plr.Character.HumanoidRootPart.CFrame = CFrame.new(524.703979, 93.712005, -375.040985)
                    end)
                end
            end
        end
    })

    boxLeft:AddToggle("AutoReset", {
        Text = "Auto Reset",
        Default = false,
        Callback = function(v)
            if v then
                cons["AutoReset"] = rs.GameCorrectionEvents.GameCorrectionsNotify.OnClientEvent:Connect(function(r)
                    if r == "Flying" then
                        Library:Notify("Auto Reset", 3)
                        if hum then hum:ChangeState("Dead") end
                    end
                end)
            else
                if cons["AutoReset"] then
                    cons["AutoReset"]:Disconnect()
                end
            end
        end
    })

    -- Loop TP - Optimiert mit sauberer Rückkehr
    local loopTPActive = false
    local loopTask = nil
    local startPosition = nil
    local loopTPType = "Plots"

    local plotPositions = {
        CFrame.new(524.703979, 93.7120056, -375.040985),
        CFrame.new(584.452026, 141.213989, -99.8799973),
        CFrame.new(-524.942993, 21.6340027, -165.309998),
        CFrame.new(302.973022, 13.8590088, 482.948975),
        CFrame.new(-571.75, 19.5239868, 89),
    }

    local voidPositions = {
        CFrame.new(0, -50000, 0),
        CFrame.new(25000, -50000, 25000),
        CFrame.new(-25000, -50000, -25000),
        CFrame.new(35000, -50000, -20000),
        CFrame.new(-35000, -50000, 20000),
        CFrame.new(20000, -50000, -35000),
        CFrame.new(-20000, -50000, 35000),
        CFrame.new(45000, -50000, 45000),
    }

    local skyPositions = {
    -- 8 Positionen im perfekten Kreis (Radius 45000, Höhe 500)
    CFrame.new(45000, 500, 0),        -- 0°
    CFrame.new(31820, 500, 31820),    -- 45°
    CFrame.new(0, 500, 45000),        -- 90°
    CFrame.new(-31820, 500, 31820),   -- 135°
    CFrame.new(-45000, 500, 0),       -- 180°
    CFrame.new(-31820, 500, -31820),  -- 225°
    CFrame.new(0, 500, -45000),       -- 270°
    CFrame.new(31820, 500, -31820),   -- 315°
    
    -- 5 zusätzliche Positionen (weiter außen oder als zweiter Kreis)
    CFrame.new(60000, 500, 0),        -- 0° größerer Radius
    CFrame.new(42426, 500, 42426),    -- 45° größerer Radius
    CFrame.new(0, 500, 60000),        -- 90° größerer Radius
    CFrame.new(-42426, 500, 42426),   -- 135° größerer Radius
    CFrame.new(-60000, 500, 0),       -- 180° größerer Radius
}

    boxLeft:AddToggle("LoopTp", {
        Text = "Loop TP",
        Default = false,
        Callback = function(v)
            if v then
                startPosition = HRP.CFrame
                loopTPActive = true
                local positionIndex = 1
                local currentPositions = nil
                
                if loopTPType == "Plots" then
                    currentPositions = plotPositions
                elseif loopTPType == "Void" then
                    currentPositions = voidPositions
                elseif loopTPType == "Sky" then
                    currentPositions = skyPositions
                else
                    currentPositions = plotPositions
                end
                
                loopTask = task.spawn(function()
                    while loopTPActive do
                        if currentPositions and positionIndex <= #currentPositions then
                            HRP.CFrame = currentPositions[positionIndex]
                            stvel(HRP)
                            
                            positionIndex = positionIndex + 1
                            if positionIndex > #currentPositions then
                                positionIndex = 1
                            end
                        end
                        
                        task.wait(0.01)
                    end
                end)
            else
                loopTPActive = false
                if loopTask then
                    task.cancel(loopTask)
                    loopTask = nil
                end
                
                if startPosition then
                    HRP.CFrame = startPosition
                    stvel(HRP)
                    startPosition = nil
                end
            end
        end
    })

    local players = game:GetService("Players")
    local localPlayer = players.LocalPlayer
    local workspace = game:GetService("Workspace")
    local rs = game:GetService("ReplicatedStorage")
    local runService = game:GetService("RunService")

    local RagdollRemote = rs:WaitForChild("CharacterEvents"):WaitForChild("RagdollRemote")

    local enabled = false
    local running = false
    local token = 0

    local heartbeatConn = nil
    local diedConn = nil
    local charAddedConn = nil

    local function cleanupCharacterConnections()
        if heartbeatConn then
            heartbeatConn:Disconnect()
            heartbeatConn = nil
        end

        if diedConn then
            diedConn:Disconnect()
            diedConn = nil
        end
    end

    local function cleanupAll()
        cleanupCharacterConnections()

        if charAddedConn then
            charAddedConn:Disconnect()
            charAddedConn = nil
        end

        running = false
        token += 1
    end

    local function isStillActive(myToken)
        return enabled and token == myToken
    end

    local function getCharacterParts(character)
        local humanoid = character:FindFirstChildOfClass("Humanoid")
        local hrp = character:FindFirstChild("HumanoidRootPart")
        local torso = character:FindFirstChild("Torso") or character:FindFirstChild("UpperTorso")

        local leftLeg =
            character:FindFirstChild("Left Leg")
            or character:FindFirstChild("LeftLowerLeg")
            or character:FindFirstChild("LeftUpperLeg")

        local rightLeg =
            character:FindFirstChild("Right Leg")
            or character:FindFirstChild("RightLowerLeg")
            or character:FindFirstChild("RightUpperLeg")

        return humanoid, hrp, torso, leftLeg, rightLeg
    end

    local function deleteLegs(character)
        if running or not enabled then return end
        running = true

        local myToken = token
        local originalFallHeight = workspace.FallenPartsDestroyHeight

        local success = pcall(function()
            character = character or localPlayer.Character or localPlayer.CharacterAdded:Wait()

            local humanoid = character:WaitForChild("Humanoid", 5)
            local hrp = character:WaitForChild("HumanoidRootPart", 5)

            if not humanoid or not hrp or not isStillActive(myToken) then return end

            local _, _, torso, leftLeg, rightLeg = getCharacterParts(character)
            if not torso or not leftLeg or not rightLeg then return end

            local originalCFrame = torso.CFrame

            workspace.FallenPartsDestroyHeight = -100
            humanoid.HipHeight = 2

            if heartbeatConn then
                heartbeatConn:Disconnect()
            end

            heartbeatConn = runService.Heartbeat:Connect(function()
                if enabled and humanoid.Parent then
                    humanoid.HipHeight = 2
                end
            end)

            RagdollRemote:FireServer(hrp, 2)

            task.wait(0.25)
            if not isStillActive(myToken) then return end

            leftLeg.CFrame = CFrame.new(0, -10000, 0)
            rightLeg.CFrame = CFrame.new(0, -10000, 0)

            task.wait(0.2)
            if not isStillActive(myToken) then return end

            torso.CFrame = CFrame.new(0, -9970, 0)

            task.wait(0.35)
            if not isStillActive(myToken) then return end

            torso.CFrame = originalCFrame
        end)

        workspace.FallenPartsDestroyHeight = originalFallHeight
        running = false

        if not success then
            warn("Delete Legs failed")
        end
    end

    local function setupCharacter(character)
        if not enabled or not character then return end

        cleanupCharacterConnections()

        local humanoid = character:WaitForChild("Humanoid", 5)
        if not humanoid then return end

        diedConn = humanoid.Died:Connect(function()
            cleanupCharacterConnections()
        end)

        task.spawn(function()
            task.wait(0.5)
            if enabled and character == localPlayer.Character then
                deleteLegs(character)
            end
        end)
    end

    local function setDeleteLegs(value)
        enabled = value
        token += 1

        if enabled then
            if charAddedConn then
                charAddedConn:Disconnect()
            end

            charAddedConn = localPlayer.CharacterAdded:Connect(function(character)
                task.wait(0.5)

                if enabled then
                    setupCharacter(character)
                end
            end)

            setupCharacter(localPlayer.Character or localPlayer.CharacterAdded:Wait())
        else
            cleanupAll()
        end
    end

    boxLeft:AddToggle("Delete Legs", {
        Text = "Delete Legs",
        Name = "Delete Legs",
        Title = "Delete Legs",
        Label = "Delete Legs",
        Flag = "DeleteLegs",
        Default = false,

        Callback = setDeleteLegs,
        Func = setDeleteLegs
    })

    -- Rechte Config Groupbox
    local configBox = Tabs.Defence:AddRightGroupbox("Config")
    
    configBox:AddSlider("AutoAntiLagSensitivity", {
        Text = "Auto Anti-Lag Sensitivity",
        Default = 100,
        Min = 50,
        Max = 500,
        Rounding = 0,
        Callback = function(v)
        end
    })

    configBox:AddSlider("AntiNetOwnerDelay", {
        Text = "Anti Net-Owner Delay",
        Default = 0.03,
        Min = 0.0001,
        Max = 0.5,
        Rounding = 2,
        Callback = function(v)
            if cons["antinetowner"] then
                cons["antinetowner"]:Disconnect()
                cons["antinetowner"] = RunService.Heartbeat:Connect(function()
                    if HRP and HRP.Parent then
                        pcall(function()
                            SetNetOwner:FireServer(HRP, HRP.CFrame)
                            task.wait(v)
                        end)
                    end
                end)
            end
        end
    })

    configBox:AddDropdown("SpawnToyType", {
        Text = "Anti Net-Owner Type",
        Values = toyDropdownValues,
        Default = 4,
        Multi = false,
        Callback = function(v)
            if spawnToyActive then
                Toggles.SpawnToy:SetValue(false)
                task.wait(0.1)
                Toggles.SpawnToy:SetValue(true)
            end
        end
    })

    --// GUCCI METHOD DROPDOWN (unter Loop TP Type)
    configBox:AddDropdown("GucciMethodType", {
        Text = "Gucci Method Type",
        Values = {"Tractor", "Blobman"},
        Default = 1,
        Multi = false,
        Callback = function(v)
            -- Wenn Gucci aktiv ist, neu starten mit neuem Typ
            if Toggles.GucciMethod and Toggles.GucciMethod.Value then
                Toggles.GucciMethod:SetValue(false)
                task.wait(0.1)
                Toggles.GucciMethod:SetValue(true)
            end
        end
    })

    configBox:AddDropdown("LoopTPType", {
        Text = "Loop TP Type",
        Values = {"Plots", "Void", "Sky"},
        Default = 1,
        Multi = false,
        Callback = function(v)
            loopTPType = v
            if loopTPActive then
                Toggles.LoopTp:SetValue(false)
                task.wait(0.1)
                Toggles.LoopTp:SetValue(true)
            end
        end
    })

--// COUNTER ATTACK SYSTEM (aus Void Hub integriert)
--// Rechte Seite - Counter Attack Controls
local counterBox = Tabs.Defence:AddRightGroupbox("Counter Attack")

-- Counter Attack Variablen
local counterAttackEnabled = false
local counterAttackMode = "Fling"
local counterAttackConnection = nil
local counterTargetCache = {}

-- Hilfsfunktionen für Counter Attack
local function getAttackerFromGrab()
    local char = plr.Character
    if not char or not char:FindFirstChild("Head") then return nil end
    
    local owner = char.Head:FindFirstChild("PartOwner")
    if not owner or not owner:IsA("StringValue") then return nil end
    
    return Players:FindFirstChild(owner.Value)
end

local function performCounterFling(attacker)
    if not attacker or not attacker.Character then return end
    local root = attacker.Character:FindFirstChild("HumanoidRootPart")
    if not root then return end
    
    pcall(function()
        SetNetOwner:FireServer(root, root.CFrame)
        if DestroyLine then DestroyLine:FireServer(root) end
        
        local away = (root.Position - HRP.Position).Unit
        away = Vector3.new(away.X, 0, away.Z) * 10000
        
        local bv = Instance.new("BodyVelocity")
        bv.Name = "CounterFling"
        bv.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
        bv.Velocity = away
        bv.P = 12500
        bv.Parent = root
        Debris:AddItem(bv, 0.1)
    end)
end

local function performCounterKill(attacker)
    if not attacker or not attacker.Character then return end
    local root = attacker.Character:FindFirstChild("HumanoidRootPart")
    local hum = attacker.Character:FindFirstChildOfClass("Humanoid")
    if not root or not hum then return end
    
    pcall(function()
        SetNetOwner:FireServer(root, root.CFrame)
        if DestroyLine then DestroyLine:FireServer(root) end
        
        hum:ChangeState(Enum.HumanoidStateType.Dead)
        hum.Health = 0
        
        local away = (root.Position - HRP.Position).Unit * 99999999999999
        local bv = Instance.new("BodyVelocity")
        bv.Name = "CounterKill"
        bv.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
        bv.Velocity = away
        bv.P = 12500
        bv.Parent = root
        Debris:AddItem(bv, 0.1)
    end)
end

local function performCounterHeaven(attacker)
    if not attacker or not attacker.Character then return end
    local root = attacker.Character:FindFirstChild("HumanoidRootPart")
    if not root then return end
    
    pcall(function()
        SetNetOwner:FireServer(root, root.CFrame)
        if DestroyLine then DestroyLine:FireServer(root) end
        
        local bv = Instance.new("BodyVelocity")
        bv.Name = "CounterHeaven"
        bv.MaxForce = Vector3.new(0, math.huge, 0)
        bv.Velocity = Vector3.new(0, 100, 0)
        bv.P = 12500
        bv.Parent = root
        Debris:AddItem(bv, 5)
    end)
end

local function performCounterKick(attacker)
    if not attacker or not attacker.Character then return end
    local root = attacker.Character:FindFirstChild("HumanoidRootPart")
    if not root then return end
    
    pcall(function()
        SetNetOwner:FireServer(root, root.CFrame)
        if DestroyLine then DestroyLine:FireServer(root) end
        
        root.CFrame = CFrame.new(0, 999999999999, 0)
        local bv = Instance.new("BodyVelocity")
        bv.Name = "CounterKick"
        bv.MaxForce = Vector3.new(0, math.huge, 0)
        bv.Velocity = Vector3.new(0, 99999999999999, 0)
        bv.P = 12500
        bv.Parent = root
        Debris:AddItem(bv, 5)
    end)
end

local function performCounterRagdoll(attacker)
    if not attacker or not attacker.Character then return end
    local root = attacker.Character:FindFirstChild("HumanoidRootPart")
    if not root then return end
    
    pcall(function()
        SetNetOwner:FireServer(root, root.CFrame)
        if DestroyLine then DestroyLine:FireServer(root) end
        
        local bv = Instance.new("BodyVelocity")
        bv.Name = "CounterRagdoll"
        bv.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
        bv.Velocity = Vector3.new(0, -90, 0)
        bv.P = 12500
        bv.Parent = root
        Debris:AddItem(bv, 0.1)
    end)
end

local function performCounterHell(attacker)
    if not attacker or not attacker.Character then return end
    local root = attacker.Character:FindFirstChild("HumanoidRootPart")
    if not root then return end
    
    pcall(function()
        SetNetOwner:FireServer(root, root.CFrame)
        if DestroyLine then DestroyLine:FireServer(root) end
        
        for _, part in ipairs(attacker.Character:GetDescendants()) do
            if part:IsA("BasePart") and not part.Anchored then
                part.CanCollide = false
            end
        end
        
        local bv = Instance.new("BodyVelocity")
        bv.Name = "CounterHell"
        bv.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
        bv.Velocity = Vector3.new(0, -10000000, 0)
        bv.P = 12500
        bv.Parent = root
        
        local noclipConnection
        noclipConnection = RunService.Heartbeat:Connect(function()
            if not attacker.Character or not attacker.Character.Parent then
                noclipConnection:Disconnect()
                return
            end
            for _, part in ipairs(attacker.Character:GetDescendants()) do
                if part:IsA("BasePart") and not part.Anchored then
                    part.CanCollide = false
                end
            end
        end)
        
        task.delay(1.5, function()
            if noclipConnection then noclipConnection:Disconnect() end
        end)
        
        Debris:AddItem(bv, 0.1)
    end)
end

local function performCounterChina(attacker)
    if not attacker or not attacker.Character then return end
    local root = attacker.Character:FindFirstChild("HumanoidRootPart")
    if not root then return end
    
    pcall(function()
        SetNetOwner:FireServer(root, root.CFrame)
        if DestroyLine then DestroyLine:FireServer(root) end
        
        root.CFrame = CFrame.new(591, 153, -101)
    end)
end

local function performCounterGrabLine(attacker)
    if not attacker or not attacker.Character then return end
    local head = attacker.Character:FindFirstChild("Head")
    local hrp = attacker.Character:FindFirstChild("HumanoidRootPart")
    if not head or not hrp then return end
    
    pcall(function()
        for i = 1, 3 do
            CreateLine:FireServer(head, head.CFrame)
            CreateLine:FireServer(hrp, hrp.CFrame)
        end
    end)
end

local function executeCounterAttack()
    local attacker = getAttackerFromGrab()
    if not attacker then return end
    
    -- Cache für Anti-Spam
    if counterTargetCache[attacker.UserId] and tick() - counterTargetCache[attacker.UserId] < 0.5 then
        return
    end
    counterTargetCache[attacker.UserId] = tick()
    
    -- Notification
    Library:Notify({
        Title = "Counter Attack!",
        Description = "Attacking back: " .. attacker.Name,
        Duration = 3,
    })
    
    -- Mode ausführen
    if counterAttackMode == "Fling" then
        performCounterFling(attacker)
    elseif counterAttackMode == "Kill" then
        performCounterKill(attacker)
    elseif counterAttackMode == "Send to Heaven" then
        performCounterHeaven(attacker)
    elseif counterAttackMode == "Kick" then
        performCounterKick(attacker)
    elseif counterAttackMode == "Ragdoll" then
        performCounterRagdoll(attacker)
    elseif counterAttackMode == "Hell" then
        performCounterHell(attacker)
    elseif counterAttackMode == "China" then
        performCounterChina(attacker)
    elseif counterAttackMode == "GrabLine" then
        performCounterGrabLine(attacker)
    end
end

-- Counter Attack Toggle
counterBox:AddToggle("CounterAttack", {
    Text = "Enable Counter Attack",
    Default = false,
    Callback = function(v)
        counterAttackEnabled = v
        
        if v then
            if counterAttackConnection then counterAttackConnection:Disconnect() end
            
            counterAttackConnection = RunService.Heartbeat:Connect(function()
                if not counterAttackEnabled then return end
                
                -- Prüfe ob wir gegrabbed werden
                local char = plr.Character
                if not char or not char:FindFirstChild("Head") then return end
                
                local owner = char.Head:FindFirstChild("PartOwner")
                if not owner or not owner:IsA("StringValue") then return end
                
                local attacker = Players:FindFirstChild(owner.Value)
                if not attacker then return end
                
                -- Counter ausführen
                executeCounterAttack()
            end)
            
            Library:Notify({
                Title = "Counter Attack",
                Description = "Counter Attack system activated! Mode: " .. counterAttackMode,
                Duration = 4,
            })
        else
            if counterAttackConnection then
                counterAttackConnection:Disconnect()
                counterAttackConnection = nil
            end
            counterTargetCache = {}
        end
    end
})

-- Counter Attack Mode Dropdown
counterBox:AddDropdown("CounterAttackMode", {
    Text = "Counter Mode",
    Values = {"Fling", "Kill", "Send to Heaven", "Kick", "Ragdoll", "Hell", "China", "GrabLine"},
    Default = 1,
    Multi = false,
    Callback = function(v)
        counterAttackMode = v
        if counterAttackEnabled then
            Library:Notify({
                Title = "Counter Attack",
                Description = "Mode changed to: " .. v,
                Duration = 2,
            })
        end
    end
})



--// ERWEITERTE COUNTER ATTACK LOGIK (in bestehende Anti-Grab Integration)
-- Verbindet Counter Attack mit Anti-Grab für maximalen Schutz

-- Anti-Grab erweitern mit Counter-Option
local originalAntiGrabCallback = nil

-- In der Anti-Grab Toggle Callback-Logik:
-- Wenn Counter Attack aktiv ist, wird automatisch zurückgegriffen

-- Zusätzliche Integration: Wenn Anti-Grab + Counter Attack aktiv
local function enhancedAntiGrab()
    if not (Toggles.AntiGrab and Toggles.AntiGrab.Value) then return end
    if not counterAttackEnabled then return end
    
    -- Kombinierte Defence + Counter
    local char = plr.Character
    if not char then return end
    
    local head = char:FindFirstChild("Head")
    if not head then return end
    
    local owner = head:FindFirstChild("PartOwner")
    if not owner then return end
    
    -- Sofortiger Counter
    executeCounterAttack()
end
end

-- ==================== Combat/Auras Tab ====================
do
    local box = Tabs.Combat:AddLeftGroupbox("Combat")

    box:AddToggle("SuperStrength", {
        Text = "Super Strength",
        Default = false,
        Callback = function(v)
            if v then
                local obj
                cons["supstrgetobj"] = workspace.ChildAdded:Connect(function(c)
                    if c.Name == "GrabParts" then
                        local part = c:FindFirstChild("GrabPart") or c:WaitForChild("GrabPart", 1)
                        if part then
                            local weld = part:FindFirstChild("WeldConstraint") or part:WaitForChild("WeldConstraint", 1)
                            if weld then
                                obj = weld.Part1
                            end
                        end
                    end
                end)
                cons["dplrobj"] = workspace.ChildRemoved:Connect(function(c)
                    task.wait()
                    if c.Name == "GrabParts" then
                        obj = nil
                    end
                end)
                cons["superstrength"] = UserInputService.InputBegan:Connect(function(inp)
                    if inp.UserInputType == Enum.UserInputType.MouseButton2 then
                        if obj then
                            local bv = Instance.new("BodyVelocity", obj)
                            bv.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
                            bv.Velocity = Camera.CFrame.LookVector * strength
                            obj = nil
                        end
                    end
                end)
            else
                if cons["supstrgetobj"] then cons["supstrgetobj"]:Disconnect() end
                if cons["superstrength"] then cons["superstrength"]:Disconnect() end
                if cons["dplrobj"] then cons["dplrobj"]:Disconnect() end
            end
        end
    })

    box:AddToggle("KillGrab", {
        Text = "Kill Grab",
        Default = false,
        Callback = function(v)
            if v then
                cons["KillGrab"] = workspace.ChildAdded:Connect(function(c)
                    if c.Name == "GrabParts" then
                        local part = c:FindFirstChild("GrabPart") or c:WaitForChild("GrabPart", 1)
                        if part then
                            local weld = part:FindFirstChild("WeldConstraint") or part:WaitForChild("WeldConstraint", 1)
                            if weld and weld.Part1.Parent:FindFirstChild("HumanoidRootPart") then
                                weld.Part1.Parent.Humanoid:ChangeState("Dead")
                                task.wait(0.1)
                                DestroyLine:FireServer(weld.Part1)
                            end
                        end
                    end
                end)
            else
                if cons["KillGrab"] then cons["KillGrab"]:Disconnect() end
            end
        end
    })

    box:AddToggle("MasslessGrab", {
        Text = "Massless Grab",
        Default = false,
        Callback = function(v)
            if v then
                cons["masslessgrab"] = workspace.ChildAdded:Connect(function(c)
                    if c.Name == "GrabParts" then
                        local part = c:FindFirstChild("DragPart") or c:WaitForChild("DragPart", 1)
                        if part then
                            local pos, ori = part:FindFirstChild("AlignPosition") or part:WaitForChild("AlignPosition", 1), part:FindFirstChild("AlignOrientation") or part:WaitForChild("AlignOrientation", 1)
                            if pos and ori then
                                pos.MaxAxesForce = Vector3.new(math.huge, math.huge, math.huge)
                                pos.MaxForce = math.huge
                                pos.Responsiveness = 200
                                ori.Responsiveness = 200
                                ori.MaxTorque = math.huge
                            end
                        end
                    end
                end)
            else
                if cons["masslessgrab"] then cons["masslessgrab"]:Disconnect() end
            end
        end
    })

    box:AddToggle("SpinGrab", {
        Text = "Spin Grab",
        Default = false,
        Callback = function(v)
            spingrab = v
            if spingrab then
                local char = plr.Character or plr.CharacterAdded:Wait()
                local hrp = char:WaitForChild("HumanoidRootPart")
                cons["spingrabConnection"] = workspace.ChildAdded:Connect(function(e)
                    if e.Name == "GrabParts" and e:FindFirstChild("GrabPart") then
                        local dragPart = workspace.GrabParts:FindFirstChild("DragPart")
                        if dragPart then
                            local ao = dragPart:FindFirstChild("AlignOrientation")
                            if ao then
                                ao:Destroy()
                            end
                        end
                        local part1 = e.GrabPart:FindFirstChild("WeldConstraint") and e.GrabPart.WeldConstraint.Part1
                        if part1 then
                            while workspace:FindFirstChild("GrabParts") and spingrab and task.wait() do
                                part1.AssemblyAngularVelocity = Vector3.new(0, spinspeed, 0)
                            end
                        end
                    end
                end)
            else
                if cons["spingrabConnection"] then
                    cons["spingrabConnection"]:Disconnect()
                end
            end
        end
    })

    box:AddToggle("RagdollGrab", {
        Text = "Ragdoll Grab",
        Default = false,
        Callback = function(v)
            if v then
                local pal, pal2
                pal2 = plr.PlayerGui.MenuGui.Menu.TabContents.ToyDestroy.Contents.ChildAdded:Connect(function(c)
                    if c.Name == "PalletLightBrown" then
                        pal = c
                        task.wait()
                        pal2:Disconnect()
                        pal2 = nil
                    end
                end)
                local ragd = spawntoy("PalletLightBrown", HRP.CFrame * CFrame.new(5, 5, 20))
                local partt = ragd:WaitForChild("SoundPart", 0.1)
                ragd.Name = "ragdoll"
                spawn(function()
                    task.wait(1)
                    local ragdoll = pal.ViewItemButton.NewMessage:Clone()
                    ragdoll.Name = "Ragdoll"
                    ragdoll.TextColor3 = Color3.fromRGB(255, 255, 255)
                    ragdoll.Text = "Ragdoll Grab"
                    ragdoll.Visible = true
                    ragdoll.Parent = pal.ViewItemButton
                end)
                repeat sno(partt) task.wait() until partt:FindFirstChild("PartOwner")
                partt.AssemblyLinearVelocity = Vector3.new(0, 10000, 0)
                spawn(function()
                    for i, v in pairs(ragd:GetDescendants()) do
                        if v:IsA("Part") then
                            v.Transparency = 1
                            v.CanCollide = false
                        end
                    end
                end)
                cons["rgarab1"] = workspace.ChildAdded:Connect(function(c)
                    if c.Name == "GrabParts" then
                        local part = c:FindFirstChild("GrabPart") or c:WaitForChild("GrabPart", 3)
                        if part then
                            local obj = part.WeldConstraint.Part1
                            while workspace:FindFirstChild("GrabParts") and task.wait() do
                                if obj then
                                    if obj.Parent and obj.Parent:FindFirstChild("HumanoidRootPart") and obj.Parent:FindFirstChild("Humanoid") and obj.Parent.Humanoid:FindFirstChild("Ragdolled") and obj.Parent.Humanoid.Ragdolled.Value == false then
                                        spawn(function()
                                            partt.AssemblyLinearVelocity = Vector3.new(0, 100, 0)
                                            partt.CFrame = obj.Parent.HumanoidRootPart.CFrame
                                            task.wait(0.05)
                                            partt.CFrame = CFrame.new(0, 1e9, 0)
                                        end)
                                    end
                                end
                            end
                        end
                    end
                end)
            else
                if cons["rgarab1"] then cons["rgarab1"]:Disconnect() end
                DestroyToy:FireServer(inv.ragdoll)
            end
        end
    })

    box:AddToggle("KickGrab", {
        Text = "Kick Grab",
        Default = false,
        Callback = function(v)
            if v then
                cons["KickGrab"] = workspace.ChildAdded:Connect(function(c)
                    if c.Name ~= "GrabParts" then return end
                    local GrabPart = c:WaitForChild("GrabPart", 0.1)
                    task.wait(0.1)
                    local part = GrabPart.WeldConstraint.Part1
                    if game.Players:FindFirstChild(part.Parent.Name) then
                        while GrabPart and GrabPart.Parent do
                            DestroyLine:FireServer(part)
                            RunService.RenderStepped:Wait()
                            SetNetOwner:FireServer(part, part.CFrame)
                            DestroyLine:FireServer(part)
                            RunService.RenderStepped:Wait()
                            SetNetOwner:FireServer(part, part.CFrame)
                            DestroyLine:FireServer(part)
                            RunService.RenderStepped:Wait()
                            SetNetOwner:FireServer(part, part.CFrame)
                            DestroyLine:FireServer(part)
                            RunService.RenderStepped:Wait()
                            SetNetOwner:FireServer(part, part.CFrame)
                        end
                    end
                end)
            else
                if cons["KickGrab"] then
                    cons["KickGrab"]:Disconnect()
                    cons["KickGrab"] = nil
                end
            end
        end
    })
end

-- ==================== Combat/Auras - Auras ====================
do
    local box = Tabs.Combat:AddRightGroupbox("Auras")
    
    local Players = game:GetService("Players")
    local RunService = game:GetService("RunService")
    local Debris = game:GetService("Debris")
    local ReplicatedStorage = game:GetService("ReplicatedStorage")
    
    local localPlayer = Players.LocalPlayer
    local SetNetworkOwner = ReplicatedStorage:WaitForChild("GrabEvents"):WaitForChild("SetNetworkOwner")
    
    local flingConnection, tpConnection, killConnection, killAura2Connection, launchConnection, killAura3Connection, crazyAuraConnection = nil, nil, nil, nil, nil, nil, nil
    
    local function setNetwork(targetPart)
        if targetPart then
            SetNetworkOwner:FireServer(targetPart, localPlayer.Character.HumanoidRootPart.CFrame)
        end
    end
    
    local function setNetwork2(targetPart)
        if targetPart then
            SetNetworkOwner:FireServer(targetPart, localPlayer.Character.HumanoidRootPart.CFrame)
        end
    end
    
    local function setNetwork3(targetPart)
        if targetPart then
            SetNetworkOwner:FireServer(targetPart, localPlayer.Character.HumanoidRootPart.CFrame)
        end
    end
    
    --// FLING AURA
    local function startFlingAura()
        local FLING_RADIUS = 25
        local FLING_FORCE = 999999999999999999999999
        
        flingConnection = RunService.RenderStepped:Connect(function()
            local myCharacter = localPlayer.Character
            if not myCharacter then return end
            local myHRP = myCharacter:FindFirstChild("HumanoidRootPart")
            if not myHRP then return end
            
            for _, player in ipairs(Players:GetPlayers()) do
                if player ~= localPlayer and player.Character then
                    local targetHRP = player.Character:FindFirstChild("HumanoidRootPart")
                    if targetHRP and (targetHRP.Position - myHRP.Position).Magnitude <= FLING_RADIUS then
                        setNetwork(targetHRP)
                        local direction = (targetHRP.Position - myHRP.Position).Unit
                        direction = Vector3.new(direction.X, 0, direction.Z)
                        local bodyVelocity = Instance.new("BodyVelocity")
                        bodyVelocity.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
                        bodyVelocity.Velocity = direction * FLING_FORCE
                        bodyVelocity.Parent = targetHRP
                        Debris:AddItem(bodyVelocity, 0.1)
                    end
                end
            end
        end)
    end
    
    local function stopFlingAura()
        if flingConnection then
            flingConnection:Disconnect()
            flingConnection = nil
        end
    end
    
    box:AddToggle("FlingAura", {
        Text = "Fling Aura",
        Default = false,
        Callback = function(value)
            if value then
                startFlingAura()
            else
                stopFlingAura()
            end
        end,
    })
    
    --// TELEPORT AURA
    local function startTPAura()
        local TELEPORT_RADIUS = 25
        local TARGET_POSITION = Vector3.new(592, 153, -101)
        
        tpConnection = RunService.RenderStepped:Connect(function()
            local myCharacter = localPlayer.Character
            if not myCharacter then return end
            local myHRP = myCharacter:FindFirstChild("HumanoidRootPart")
            if not myHRP then return end
            
            for _, player in ipairs(Players:GetPlayers()) do
                if player ~= localPlayer and player.Character then
                    local targetHRP = player.Character:FindFirstChild("HumanoidRootPart")
                    if targetHRP and (targetHRP.Position - myHRP.Position).Magnitude <= TELEPORT_RADIUS then
                        setNetwork(targetHRP)
                        targetHRP.CFrame = CFrame.new(TARGET_POSITION)
                    end
                end
            end
        end)
    end
    
    local function stopTPAura()
        if tpConnection then
            tpConnection:Disconnect()
            tpConnection = nil
        end
    end
    
    box:AddToggle("TPAura", {
        Text = "Teleport Aura",
        Default = false,
        Callback = function(value)
            if value then
                startTPAura()
            else
                stopTPAura()
            end
        end,
    })
    
    
    --// KILL AURA 2
    local function startKillAura2()
        local KILL_RADIUS_2 = 25
        
        killAura2Connection = RunService.RenderStepped:Connect(function()
            local myCharacter = localPlayer.Character
            if not myCharacter then return end
            local myHRP = myCharacter:FindFirstChild("HumanoidRootPart")
            if not myHRP then return end
            
            for _, player in ipairs(Players:GetPlayers()) do
                if player ~= localPlayer and player.Character then
                    local targetHRP = player.Character:FindFirstChild("HumanoidRootPart")
                    local humanoid = player.Character:FindFirstChild("Humanoid")
                    if targetHRP and humanoid and (targetHRP.Position - myHRP.Position).Magnitude <= KILL_RADIUS_2 then
                        setNetwork2(targetHRP)
                        humanoid.Health = 0
                    end
                end
            end
        end)
    end
    
    local function stopKillAura2()
        if killAura2Connection then
            killAura2Connection:Disconnect()
            killAura2Connection = nil
        end
    end
    
    box:AddToggle("KillAura2", {
        Text = "KillAura 2 (slow but good)",
        Default = false,
        Callback = function(value)
            if value then
                startKillAura2()
            else
                stopKillAura2()
            end
        end,
    })
    
    --// PERMKILL AURA (LAUNCH)
    local function startLaunchAura()
        local EFFECT_RADIUS = 25
        local LAUNCH_FORCE = Vector3.new(0, 100, 0)
        local playerData = {}
        
        launchConnection = RunService.RenderStepped:Connect(function()
            local myCharacter = localPlayer.Character
            if not myCharacter then return end
            local myHRP = myCharacter:FindFirstChild("HumanoidRootPart")
            if not myHRP then return end
            
            for _, player in ipairs(Players:GetPlayers()) do
                if player ~= localPlayer and player.Character then
                    local targetHRP = player.Character:FindFirstChild("HumanoidRootPart")
                    if targetHRP and (targetHRP.Position - myHRP.Position).Magnitude <= EFFECT_RADIUS then
                        setNetwork(targetHRP)
                        if not playerData[player] then
                            local bodyVelocity = Instance.new("BodyVelocity")
                            bodyVelocity.Name = "LaunchForce"
                            bodyVelocity.Velocity = LAUNCH_FORCE
                            bodyVelocity.MaxForce = Vector3.new(1e10, 1e10, 1e10)
                            bodyVelocity.P = 1e9
                            bodyVelocity.Parent = targetHRP
                            playerData[player] = true
                        end
                    end
                end
            end
        end)
    end
    
    local function stopLaunchAura()
        if launchConnection then
            launchConnection:Disconnect()
            launchConnection = nil
        end
    end
    
    box:AddToggle("PermKillAura", {
        Text = "PermKill Aura (ragdoll player first)",
        Default = false,
        Callback = function(value)
            if value then
                startLaunchAura()
            else
                stopLaunchAura()
            end
        end,
    })
    
    --// KILL AURA 3
    local function startKillAura3()
        local KILL_RADIUS_3 = 25
        
        killAura3Connection = RunService.RenderStepped:Connect(function()
            local myCharacter = localPlayer.Character
            if not myCharacter then return end
            local myHRP = myCharacter:FindFirstChild("HumanoidRootPart")
            if not myHRP then return end
            
            for _, player in ipairs(Players:GetPlayers()) do
                if player ~= localPlayer and player.Character then
                    local targetHRP = player.Character:FindFirstChild("HumanoidRootPart")
                    local humanoid = player.Character:FindFirstChildOfClass("Humanoid")
                    if targetHRP and humanoid and (targetHRP.Position - myHRP.Position).Magnitude <= KILL_RADIUS_3 then
                        setNetwork3(targetHRP)
                        humanoid.BreakJointsOnDeath = false
                        humanoid.RequiresNeck = false
                        pcall(function()
                            humanoid.MaxHealth = 0
                        end)
                        humanoid.Health = 0
                    end
                end
            end
        end)
    end
    
    local function stopKillAura3()
        if killAura3Connection then
            killAura3Connection:Disconnect()
            killAura3Connection = nil
        end
    end
    
    box:AddToggle("KillAura3", {
        Text = "Kill Aura",
        Default = false,
        Callback = function(state)
            if state then
                startKillAura3()
            else
                stopKillAura3()
            end
        end,
    })
    
    --// CRAZY AURA
    local function startCrazyAura()
        local KICK_RADIUS = 25
        local RETURN_OFFSET = Vector3.new(0, 10, 0)
        
        crazyAuraConnection = RunService.RenderStepped:Connect(function()
            local myCharacter = localPlayer.Character
            if not myCharacter then return end
            local myHRP = myCharacter:FindFirstChild("HumanoidRootPart")
            if not myHRP then return end
            
            for _, player in ipairs(Players:GetPlayers()) do
                if player ~= localPlayer and player.Character then
                    local targetHRP = player.Character:FindFirstChild("HumanoidRootPart")
                    if targetHRP and (targetHRP.Position - myHRP.Position).Magnitude <= KICK_RADIUS then
                        setNetwork(targetHRP)
                        
                        local randomPos = Vector3.new(
                            math.random(-5000, 5000),
                            math.random(500, 1500),
                            math.random(-5000, 5000)
                        )
                        
                        targetHRP.CFrame = CFrame.new(randomPos)
                        task.wait(0.05)
                        targetHRP.CFrame = myHRP.CFrame + RETURN_OFFSET
                    end
                end
            end
        end)
    end
    
    local function stopCrazyAura()
        if crazyAuraConnection then
            crazyAuraConnection:Disconnect()
            crazyAuraConnection = nil
        end
    end
    
    box:AddToggle("CrazyAura", {
        Text = "Crazy Aura",
        Default = false,
        Callback = function(value)
            if value then
                startCrazyAura()
            else
                stopCrazyAura()
            end
        end,
    })
end

-- ==================== Combat - Settings ====================
do
    local box = Tabs.Combat:AddLeftGroupbox("Settings", "wrench")

    box:AddSlider("Strength", {
        Text = "Strength",
        Default = 300,
        Min = 300,
        Max = 40000,
        Rounding = 1,
        Callback = function(v)
            strength = v
        end
    })

    box:AddSlider("SpinSpeed", {
        Text = "Spin Speed",
        Default = 500,
        Min = 10,
        Max = 1000,
        Rounding = 1,
        Callback = function(v)
            spinspeed = v
        end
    })

    box:AddSlider("JerkSpeed", {
        Text = "Jerk Interval",
        Default = 0.1,
        Min = 0.01,
        Max = 1,
        Rounding = 11,
        Callback = function(v)
            jerkspeed = v
        end
    })
end

-- ==================== Combat - Settings ====================
do
    local box = Tabs.Combat:AddLeftGroupbox("Settings", "wrench")

    box:AddSlider("Strength", {
        Text = "Strength",
        Default = 300,
        Min = 300,
        Max = 40000,
        Rounding = 1,
        Callback = function(v)
            strength = v
        end
    })

    box:AddSlider("SpinSpeed", {
        Text = "Spin Speed",
        Default = 500,
        Min = 10,
        Max = 1000,
        Rounding = 1,
        Callback = function(v)
            spinspeed = v
        end
    })

    box:AddSlider("JerkSpeed", {
        Text = "Jerk Interval",
        Default = 0.1,
        Min = 0.01,
        Max = 1,
        Rounding = 11,
        Callback = function(v)
            jerkspeed = v
        end
    })
end

-- ==================== Combat - Misc ====================
do
    local box = Tabs.Combat:AddRightGroupbox("Misc")

    box:AddToggle("WaterWalk", {
        Text = "Water Walk",
        Default = false,
        Callback = function(v)
            for i, vv in pairs(workspace.Map.AlwaysHereTweenedObjects.Ocean.Object.ObjectModel:GetChildren()) do
                if vv.Name == "Ocean" then
                    vv.CanCollide = v
                end
            end
        end
    })



    box:AddButton("Break Barrier", function()
    local pos = HRP.CFrame
    stvel(HRP) 

    -- Hamburger holen oder spawnen
    local burg = inv:FindFirstChild("FoodHamburger") or inv:FindFirstChild("Hamburger") or inv:FindFirstChild("Burger")
    if not burg then
        burg = spawntoy("FoodHamburger", HRP.CFrame * CFrame.new(5, 5, 20))
    end
    
    -- Warten, bis das Objekt bereit ist
    local timeout = 0
    while not burg and timeout < 30 do
        task.wait(0.05)
        burg = inv:FindFirstChild("FoodHamburger") or inv:FindFirstChild("Hamburger") or inv:FindFirstChild("Burger")
        timeout = timeout + 1
    end
    if not burg then return end

    -- 1. Hamburger grabben
    grab(burg)
    task.wait(0.1) -- Dem Server Zeit geben, das Grabben zu registrieren

    -- 2. Teleport zur Barriere
    if workspace:FindFirstChild("Waypoints") and workspace.Waypoints:FindFirstChild("TudorHouse") then
        HRP.CFrame = workspace.Waypoints.TudorHouse.CFrame
        
        -- WICHTIG: Kurze Verzögerung an der Barriere einlegen!
        -- Wenn du dich zu schnell zurückportest, bleibst du auf Serverseite hängen.
        task.wait(0.2) 
        
        -- 3. Hamburger zerstören, WÄHREND du dort stehst
        DestroyToy:FireServer(burg)
        task.wait(0.05)
        
        -- 4. Erst jetzt zurück zur alten Position teleportieren
        HRP.CFrame = pos
    else
        -- Falls der Wegpunkt falsch ist, wirst du direkt zurückgesetzt
        HRP.CFrame = pos
    end
end)

    box:AddButton("Bring Train\n(You can use vfly in IY)", function()
        local pos = HRP.CFrame
        local burger = spawntoy("FoodHamburger", HRP.CFrame)
        repeat task.wait() until burger and burger:FindFirstChild("HoldPart")
        workspace.Map.AlwaysHereTweenedObjects.Train.Object.ObjectModel.Seat:Sit(hum)
        workspace.Map.AlwaysHereTweenedObjects.Train.Object.FollowThisPart.AlignPosition.Enabled = false
        workspace.Map.AlwaysHereTweenedObjects.Train.Object.FollowThisPart.AlignOrientation.Enabled = false
        task.wait(0.1)
        grab(burger)
        task.wait(0.1)
        DestroyToy:FireServer(inv.FoodHamburger)
        HRP.CFrame = pos * CFrame.new(0, 5, 0)
    end)

    box:AddButton("Ragdoll", function()
        Ragdoll:FireServer(HRP, 1)
    end)

    box:AddToggle("LoopRagdoll", {
        Text = "Loop Ragdoll",
        Default = false,
        Callback = function(v)
            loopragdoll = v
            if v then
                task.spawn(function()
                    while loopragdoll and task.wait(0.05) do
                        Ragdoll:FireServer(HRP, 0.5)
                    end
                end)
            end
        end
    })

    box:AddToggle("NoBarrierCollision", {
	Text = "Ignore House Barriers",
	Default = false,
	Callback = function(Value)
		local plots = workspace:FindFirstChild("Plots")
		if not plots then
			return
		end
		for _, plot in ipairs(plots:GetChildren()) do
			local barrier = plot:FindFirstChild("Barrier")
			if barrier then
				for _, obj in ipairs(barrier:GetDescendants()) do
					if obj:IsA("BasePart") then
						obj.CanCollide = not Value
					end
				end
			end
		end
	end
})

    box:AddToggle("KickNotify", {
        Text = "Kick Notify",
        Default = false,
        Callback = function(v)
            if v then
                cons["kicknotify"] = game.Players.PlayerRemoving:Connect(function(plrr)
                    if workspace:FindFirstChild("BlackHoleKick") then
                        Library:Notify({
                            Title = "Posral",
                            Description = plrr.Name .. "(" .. plrr.DisplayName .. ")" .. " Got Kicked",
                            Time = 4,
                        })
                        workspace:FindFirstChild("BlackHoleKick").Name = plrr.Name .. "KICK"
                    end
                end)
            else
                if cons["kicknotify"] then
                    cons["kicknotify"]:Disconnect()
                    cons["kicknotify"] = nil
                end
            end
        end
    })
end


do
    -- ANPASSEN: Dein Tabs-Objekt hier einfügen
    -- Beispiel: local Tabs = Window:CreateTab("Player")
    local box = Tabs.Player:AddLeftGroupbox("Player")
    local rightBox = Tabs.Player:AddRightGroupbox("Teleporting")
    local rightBox2 = Tabs.Player:AddRightGroupbox("Animations")

    local Players = game:GetService("Players")
    local RunService = game:GetService("RunService")
    local UserInputService = game:GetService("UserInputService")
    local TweenService = game:GetService("TweenService")

    local plr = Players.LocalPlayer
    local char, hum, HRP

    --// =========================
    --// TELEPORT LOCATIONS
    --// ═══════════════════════════════════════
    --// HIER EINFACH DEINE POSITIONEN EINFÜGEN!
    --// Format: ["Name"] = CFrame.new(x, y, z),
    --// ═══════════════════════════════════════
    --//
    local TELEPORT_LOCATIONS = {
        ["Yellow house"] = CFrame.new(584.452026, 141.213989, -99.8799973),
        ["Blue house"] = CFrame.new(524.703979, 93.7120056, -375.040985),
        ["Pink roof house"] = CFrame.new(-524.942993, 21.6340027, -165.309998),
        ["Spooky house"] = CFrame.new(302.973022, 13.8590088, 482.948975),
        ["Green roof house"] = CFrame.new(-571.75, 19.5239868, 89),

        
        -- Einfach so neue hinzufügen:
        -- ["Mein Haus"] = CFrame.new(123, 45, 678),
    }
    --//
    --// ═══════════════════════════════════════

    --// =========================
    --// SETTINGS / VARIABLES
    --// =========================

    -- Values (Sliders)
    local walkSpeedValue = 249
    local jumpPowerValue = 24
    local flightSpeedValue = 20
    local spinSpeedValue = 214

    -- Character Toggles
    local flightEnabled = false
    local walkspeedToggleEnabled = false
    local jumpPowerToggleEnabled = false
    local characterSpinEnabled = false
    local noclipEnabled = false
    local infJumpEnabled = false

    -- Teleporting
    local selectedLocation = nil
    local loopTPLocation = false
    local selectedPlayer = nil
    local spectatePlayer = false
    local loopTPPlayer = false

    -- Animations
    local selectedAnimation = "Struggle"
    local animationSpeed = 1
    local animationToggle = false
    local currentAnimTrack = nil

    -- Internals
    local wsConn, spinConn, flyConn, noclipConn, infJumpConn, spectateConn
    local bv, bg
    local locationDropdown = nil
    local playerDropdown = nil

    --// =========================
    --// FAST CHARACTER GET
    --// =========================

    local function getCharacter()
        char = plr.Character or plr.CharacterAdded:Wait()
        hum = char:FindFirstChildOfClass("Humanoid")
        HRP = char:FindFirstChild("HumanoidRootPart")
    end

    getCharacter()

    --// =========================
    --// CLEANUP FUNCTIONS
    --// =========================

    local function stopWS()
        if wsConn then
            wsConn:Disconnect()
            wsConn = nil
        end
        if hum then
            hum.WalkSpeed = 16
        end
    end

    local function stopSpin()
        if spinConn then
            spinConn:Disconnect()
            spinConn = nil
        end
    end

    local function stopFly()
        if flyConn then
            flyConn:Disconnect()
            flyConn = nil
        end
        if bv then
            bv:Destroy()
            bv = nil
        end
        if bg then
            bg:Destroy()
            bg = nil
        end
        if hum then
            hum.PlatformStand = false
            hum.AutoRotate = true
        end
    end

    local function stopNoclip()
        if noclipConn then
            noclipConn:Disconnect()
            noclipConn = nil
        end
        if char then
            for _, part in pairs(char:GetDescendants()) do
                if part:IsA("BasePart") then
                    part.CanCollide = true
                end
            end
        end
    end

    local function stopInfJump()
        if infJumpConn then
            infJumpConn:Disconnect()
            infJumpConn = nil
        end
    end

    local function stopSpectate()
        if spectateConn then
            spectateConn:Disconnect()
            spectateConn = nil
        end
        if hum then
            workspace.CurrentCamera.CameraSubject = hum
        end
    end

    local function stopAnimation()
        if currentAnimTrack then
            currentAnimTrack:Stop()
            currentAnimTrack = nil
        end
    end

    --// =========================
    --// VALUES - WALK SPEED
    --// =========================

    local function startWalkSpeed()
        stopWS()
        if not hum or not HRP then return end
        
        hum.WalkSpeed = 0

        wsConn = RunService.PreSimulation:Connect(function(dt)
            if not walkspeedToggleEnabled then return end
            if not HRP or not hum then return end
            if hum.Health <= 0 then return end

            local moveDir = hum.MoveDirection
            if moveDir.Magnitude <= 0 then
                HRP.AssemblyLinearVelocity = Vector3.new(
                    0,
                    HRP.AssemblyLinearVelocity.Y,
                    0
                )
                return
            end

            local currentVel = HRP.AssemblyLinearVelocity
            local speedMultiplier = walkSpeedValue / 1000 * 100
            local targetVel = Vector3.new(
                moveDir.X * speedMultiplier,
                currentVel.Y,
                moveDir.Z * speedMultiplier
            )
            local lerped = currentVel:Lerp(targetVel, 0.82)
            HRP.AssemblyLinearVelocity = lerped
        end)
    end

    --// =========================
    --// VALUES - JUMP POWER
    --// =========================

    local function applyJumpPower()
        if hum then
            hum.UseJumpPower = true
            hum.JumpPower = jumpPowerValue / 1000 * 100
        end
    end

    --// =========================
    --// VALUES - FLIGHT SPEED
    --// =========================

    local function startFlight()
        stopFly()
        if not HRP or not hum then return end

        hum.PlatformStand = true
        hum.AutoRotate = false

        bv = Instance.new("BodyVelocity")
        bv.Name = "flyvel"
        bv.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
        bv.Velocity = Vector3.zero
        bv.Parent = HRP

        bg = Instance.new("BodyGyro")
        bg.Name = "flygyro"
        bg.MaxTorque = Vector3.new(math.huge, math.huge, math.huge)
        bg.P = 500000
        bg.D = 1500
        bg.CFrame = workspace.CurrentCamera.CFrame
        bg.Parent = HRP

        flyConn = RunService.PreRender:Connect(function()
            if not flightEnabled then return end
            if not HRP then return end

            local cam = workspace.CurrentCamera
            local moveVec = Vector3.zero

            if UserInputService:IsKeyDown(Enum.KeyCode.W) then
                moveVec += cam.CFrame.LookVector
            end
            if UserInputService:IsKeyDown(Enum.KeyCode.S) then
                moveVec -= cam.CFrame.LookVector
            end
            if UserInputService:IsKeyDown(Enum.KeyCode.A) then
                moveVec -= cam.CFrame.RightVector
            end
            if UserInputService:IsKeyDown(Enum.KeyCode.D) then
                moveVec += cam.CFrame.RightVector
            end
            if UserInputService:IsKeyDown(Enum.KeyCode.Space) then
                moveVec += Vector3.new(0, 1, 0)
            end
            if UserInputService:IsKeyDown(Enum.KeyCode.LeftShift) then
                moveVec -= Vector3.new(0, 1, 0)
            end

            if moveVec.Magnitude > 0 then
                moveVec = moveVec.Unit
            end

            local speed = flightSpeedValue / 20 * 100
            bv.Velocity = moveVec * speed
            bg.CFrame = cam.CFrame
        end)
    end

    --// =========================
    --// VALUES - SPIN SPEED
    --// =========================

    local function startSpin()
        stopSpin()
        spinConn = RunService.PreRender:Connect(function()
            if characterSpinEnabled and HRP then
                local speed = spinSpeedValue / 1000 * 50
                HRP.CFrame *= CFrame.Angles(0, math.rad(speed), 0)
            end
        end)
    end

    --// =========================
    --// CHARACTER - NOCLIP
    --// =========================

    local function startNoclip()
        stopNoclip()
        noclipConn = RunService.Stepped:Connect(function()
            if noclipEnabled and char then
                for _, part in pairs(char:GetDescendants()) do
                    if part:IsA("BasePart") then
                        part.CanCollide = false
                    end
                end
            end
        end)
    end

    --// =========================
    --// CHARACTER - INF JUMP
    --// =========================

    local function startInfJump()
        stopInfJump()
        infJumpConn = UserInputService.JumpRequest:Connect(function()
            if infJumpEnabled and hum and HRP then
                hum:ChangeState(Enum.HumanoidStateType.Jumping)
            end
        end)
    end

    --// =========================
    --// TELEPORTING - LOCATIONS
    --// =========================

    local function getLocationList()
        local list = {}
        for name, _ in pairs(TELEPORT_LOCATIONS) do
            table.insert(list, name)
        end
        return list
    end

    local function teleportToLocation()
        if selectedLocation and HRP then
            local targetCF = TELEPORT_LOCATIONS[selectedLocation]
            if targetCF then
                HRP.CFrame = targetCF
            end
        end
    end

    --// =========================
    --// TELEPORTING - PLAYERS
    --// =========================

    local function getPlayerList()
        local list = {}
        for _, player in pairs(Players:GetPlayers()) do
            if player ~= plr then
                table.insert(list, player.Name)
            end
        end
        return list
    end

    local function teleportToPlayer()
        if selectedPlayer and HRP then
            local target = Players:FindFirstChild(selectedPlayer)
            if target and target.Character then
                local targetHRP = target.Character:FindFirstChild("HumanoidRootPart")
                if targetHRP then
                    HRP.CFrame = targetHRP.CFrame + Vector3.new(0, 3, 0)
                end
            end
        end
    end

    -- Loop Teleporting
    RunService.Heartbeat:Connect(function()
        if loopTPLocation and selectedLocation then
            teleportToLocation()
        end
        if loopTPPlayer and selectedPlayer then
            teleportToPlayer()
        end
    end)

    --// =========================
    --// SPECTATE PLAYER
    --// =========================

    local function startSpectate()
        stopSpectate()
        if not selectedPlayer then return end
        
        spectateConn = RunService.RenderStepped:Connect(function()
            if spectatePlayer and selectedPlayer then
                local target = Players:FindFirstChild(selectedPlayer)
                if target and target.Character then
                    local targetHum = target.Character:FindFirstChildOfClass("Humanoid")
                    if targetHum then
                        workspace.CurrentCamera.CameraSubject = targetHum
                    end
                end
            end
        end)
    end


local animationList = {
    "Struggle",
    "Spasm", 
    "Headthrow",
    "Dab"
}

-- Joint Referenzen
local joints = {}
local animConn = nil
local animTime = 0
local smoothTime = 0

-- Easing Funktionen für flüssigere Bewegungen
local function easeInOutSine(t)
    return -(math.cos(math.pi * t) - 1) / 2
end

local function easeOutElastic(t)
    local c4 = (2 * math.pi) / 3
    if t == 0 then return 0 end
    if t == 1 then return 1 end
    return math.pow(2, -10 * t) * math.sin((t * 10 - 0.75) * c4) + 1
end

local function easeInOutBack(t)
    local c1 = 1.70158
    local c2 = c1 * 1.525
    if t < 0.5 then
        return (math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    else
        return (math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
    end
end

-- Joint Referenzen holen (R6 + R15 Support)
local function getJoints()
    joints = {}
    if not char then return end
    
    local function findJoint(part0, part1)
        for _, obj in pairs(part0:GetDescendants()) do
            if obj:IsA("Motor6D") and obj.Part1 == part1 then
                return obj
            end
        end
        -- Fallback: Suche im gesamten Character
        for _, obj in pairs(char:GetDescendants()) do
            if obj:IsA("Motor6D") and obj.Part1 == part1 then
                return obj
            end
        end
        return nil
    end
    
    -- R6 Support
    local torso = char:FindFirstChild("Torso")
    local head = char:FindFirstChild("Head")
    local leftArm = char:FindFirstChild("Left Arm")
    local rightArm = char:FindFirstChild("Right Arm")
    local leftLeg = char:FindFirstChild("Left Leg")
    local rightLeg = char:FindFirstChild("Right Leg")
    
    -- R15 Support
    local upperTorso = char:FindFirstChild("UpperTorso")
    local lowerTorso = char:FindFirstChild("LowerTorso")
    local leftUpperArm = char:FindFirstChild("LeftUpperArm")
    local rightUpperArm = char:FindFirstChild("RightUpperArm")
    local leftUpperLeg = char:FindFirstChild("LeftUpperLeg")
    local rightUpperLeg = char:FindFirstChild("RightUpperLeg")
    
    if torso then
        -- R6
        joints.Root = char:FindFirstChild("HumanoidRootPart") and char.HumanoidRootPart:FindFirstChild("RootJoint")
        joints.Neck = findJoint(torso, head)
        joints.LeftShoulder = findJoint(torso, leftArm)
        joints.RightShoulder = findJoint(torso, rightArm)
        joints.LeftHip = findJoint(torso, leftLeg)
        joints.RightHip = findJoint(torso, rightLeg)
        joints.Torso = torso
    elseif upperTorso and lowerTorso then
        -- R15
        joints.Root = char:FindFirstChild("HumanoidRootPart") and char.HumanoidRootPart:FindFirstChild("RootJoint")
        joints.Waist = findJoint(lowerTorso, upperTorso)
        joints.Neck = findJoint(upperTorso, head)
        joints.LeftShoulder = findJoint(upperTorso, leftUpperArm)
        joints.RightShoulder = findJoint(upperTorso, rightUpperArm)
        joints.LeftHip = findJoint(lowerTorso, leftUpperLeg)
        joints.RightHip = findJoint(lowerTorso, rightUpperLeg)
        joints.Torso = upperTorso
        
        -- R15 Unterarme/Beine für bessere Animation
        local leftLowerArm = char:FindFirstChild("LeftLowerArm")
        local rightLowerArm = char:FindFirstChild("RightLowerArm")
        local leftHand = char:FindFirstChild("LeftHand")
        local rightHand = char:FindFirstChild("RightHand")
        
        if leftLowerArm then joints.LeftElbow = findJoint(leftUpperArm, leftLowerArm) end
        if rightLowerArm then joints.RightElbow = findJoint(rightUpperArm, rightLowerArm) end
        if leftHand then joints.LeftWrist = findJoint(leftLowerArm, leftHand) end
        if rightHand then joints.RightWrist = findJoint(rightLowerArm, rightHand) end
    end
end

-- Original CFrames speichern
local originalCFrames = {}

local function saveOriginalCFrames()
    originalCFrames = {}
    for name, joint in pairs(joints) do
        if joint and joint:IsA("Motor6D") then
            originalCFrames[name] = joint.C0
        end
    end
end

local function resetJoints()
    for name, joint in pairs(joints) do
        if joint and joint:IsA("Motor6D") and originalCFrames[name] then
            -- Smooth reset
            local target = originalCFrames[name]
            joint.C0 = joint.C0:Lerp(target, 0.3)
        end
    end
end

local function hardResetJoints()
    for name, joint in pairs(joints) do
        if joint and joint:IsA("Motor6D") and originalCFrames[name] then
            joint.C0 = originalCFrames[name]
        end
    end
end

--// =========================
--// STRUGGLE - Realistisches Zappeln
--// =========================

local function animateStruggle(dt)
    local speed = (animationSpeed / 20) * 12
    animTime += dt * speed
    smoothTime += dt * speed * 0.5
    
    local breath = math.sin(smoothTime * 2) * 0.5 + 0.5
    local struggle = math.sin(animTime * 8) * math.cos(animTime * 5) * 0.5
    
    -- Arme zittern und zappeln
    if joints.LeftShoulder then
        local target = originalCFrames.LeftShoulder * CFrame.Angles(
            math.sin(animTime * 6) * 0.6 + struggle * 0.4,
            math.sin(animTime * 4) * 0.3,
            0.8 + math.sin(animTime * 7) * 0.3
        )
        joints.LeftShoulder.C0 = joints.LeftShoulder.C0:Lerp(target, 0.15)
    end
    
    if joints.RightShoulder then
        local target = originalCFrames.RightShoulder * CFrame.Angles(
            math.sin(animTime * 6 + math.pi) * 0.6 + struggle * 0.4,
            math.sin(animTime * 4 + math.pi) * 0.3,
            -0.8 - math.sin(animTime * 7) * 0.3
        )
        joints.RightShoulder.C0 = joints.RightShoulder.C0:Lerp(target, 0.15)
    end
    
    -- Kopf wackelt
    if joints.Neck then
        local target = originalCFrames.Neck * CFrame.Angles(
            math.sin(animTime * 5) * 0.25 + breath * 0.1,
            math.sin(animTime * 3) * 0.35,
            math.sin(animTime * 4) * 0.15
        )
        joints.Neck.C0 = joints.Neck.C0:Lerp(target, 0.12)
    end
    
    -- Körper dreht sich leicht
    if joints.Waist then
        local target = originalCFrames.Waist * CFrame.Angles(
            math.sin(animTime * 3) * 0.1,
            math.sin(animTime * 2) * 0.2,
            math.sin(animTime * 4) * 0.08
        )
        joints.Waist.C0 = joints.Waist.C0:Lerp(target, 0.1)
    elseif joints.Root then
        local target = originalCFrames.Root * CFrame.Angles(
            0,
            math.sin(animTime * 2) * 0.15,
            0
        )
        joints.Root.C0 = joints.Root.C0:Lerp(target, 0.1)
    end
    
    -- Beine zittern
    if joints.LeftHip then
        local target = originalCFrames.LeftHip * CFrame.Angles(
            math.sin(animTime * 5) * 0.2,
            0,
            0.1
        )
        joints.LeftHip.C0 = joints.LeftHip.C0:Lerp(target, 0.12)
    end
    
    if joints.RightHip then
        local target = originalCFrames.RightHip * CFrame.Angles(
            math.sin(animTime * 5 + math.pi) * 0.2,
            0,
            -0.1
        )
        joints.RightHip.C0 = joints.RightHip.C0:Lerp(target, 0.12)
    end
    
    -- R15 Ellenbogen
    if joints.LeftElbow then
        joints.LeftElbow.C0 = joints.LeftElbow.C0:Lerp(
            originalCFrames.LeftElbow * CFrame.Angles(math.sin(animTime * 8) * 0.3, 0, 0), 0.15
        )
    end
    if joints.RightElbow then
        joints.RightElbow.C0 = joints.RightElbow.C0:Lerp(
            originalCFrames.RightElbow * CFrame.Angles(math.sin(animTime * 8 + math.pi) * 0.3, 0, 0), 0.15
        )
    end
end

--// =========================
--// SPASM - Krampfhafte Zuckungen
--// =========================

local function animateSpasm(dt)
    local speed = (animationSpeed / 20) * 18
    animTime += dt * speed
    
    -- Zufällige Zuckungen
    local twitch1 = math.sin(animTime * 20) * math.cos(animTime * 13)
    local twitch2 = math.sin(animTime * 17 + 1) * math.cos(animTime * 11)
    local intensity = math.abs(twitch1) * 0.7 + 0.3
    
    -- Arme krampfhaft
    if joints.LeftShoulder then
        local target = originalCFrames.LeftShoulder * CFrame.Angles(
            twitch1 * 1.0 * intensity,
            twitch2 * 0.5 * intensity,
            (0.5 + twitch1 * 0.5) * intensity
        )
        joints.LeftShoulder.C0 = joints.LeftShoulder.C0:Lerp(target, 0.25)
    end
    
    if joints.RightShoulder then
        local target = originalCFrames.RightShoulder * CFrame.Angles(
            -twitch1 * 1.0 * intensity,
            -twitch2 * 0.5 * intensity,
            (-0.5 - twitch1 * 0.5) * intensity
        )
        joints.RightShoulder.C0 = joints.RightShoulder.C0:Lerp(target, 0.25)
    end
    
    -- Kopf schnell hin und her
    if joints.Neck then
        local target = originalCFrames.Neck * CFrame.Angles(
            math.sin(animTime * 15) * 0.4 * intensity,
            math.sin(animTime * 12) * 0.5 * intensity,
            math.cos(animTime * 18) * 0.2 * intensity
        )
        joints.Neck.C0 = joints.Neck.C0:Lerp(target, 0.2)
    end
    
    -- Körper zuckt
    if joints.Waist then
        local target = originalCFrames.Waist * CFrame.Angles(
            math.sin(animTime * 10) * 0.15 * intensity,
            math.sin(animTime * 8) * 0.2 * intensity,
            math.cos(animTime * 14) * 0.1 * intensity
        )
        joints.Waist.C0 = joints.Waist.C0:Lerp(target, 0.18)
    elseif joints.Root then
        local target = originalCFrames.Root * CFrame.Angles(
            math.sin(animTime * 10) * 0.1 * intensity,
            math.sin(animTime * 8) * 0.15 * intensity,
            math.cos(animTime * 14) * 0.08 * intensity
        )
        joints.Root.C0 = joints.Root.C0:Lerp(target, 0.18)
    end
    
    -- Beine
    if joints.LeftHip then
        local target = originalCFrames.LeftHip * CFrame.Angles(
            math.sin(animTime * 16) * 0.3 * intensity,
            0,
            0.15 * intensity
        )
        joints.LeftHip.C0 = joints.LeftHip.C0:Lerp(target, 0.2)
    end
    
    if joints.RightHip then
        local target = originalCFrames.RightHip * CFrame.Angles(
            math.sin(animTime * 16 + math.pi) * 0.3 * intensity,
            0,
            -0.15 * intensity
        )
        joints.RightHip.C0 = joints.RightHip.C0:Lerp(target, 0.2)
    end
    
    -- R15 Ellenbogen krampfhaft
    if joints.LeftElbow then
        joints.LeftElbow.C0 = joints.LeftElbow.C0:Lerp(
            originalCFrames.LeftElbow * CFrame.Angles(twitch2 * 0.8 * intensity, 0, 0), 0.2
        )
    end
    if joints.RightElbow then
        joints.RightElbow.C0 = joints.RightElbow.C0:Lerp(
            originalCFrames.RightElbow * CFrame.Angles(-twitch2 * 0.8 * intensity, 0, 0), 0.2
        )
    end
end

--// =========================
--// HEADTHROW - Kopf nach hinten werfen
--// =========================

local function animateHeadthrow(dt)
    local speed = (animationSpeed / 20) * 6
    animTime += dt * speed
    
    -- Zyklus: 0-1-0 (Kopf zurück, halten, zurück)
    local cycle = (math.sin(animTime * 2 - math.pi/2) + 1) / 2
    local easedCycle = easeInOutBack(cycle)
    
    -- Kopf nach hinten
    if joints.Neck then
        local target = originalCFrames.Neck * CFrame.Angles(
            -easedCycle * 1.8, -- Stark nach hinten
            math.sin(animTime * 3) * 0.15 * (1 - cycle),
            0
        )
        joints.Neck.C0 = joints.Neck.C0:Lerp(target, 0.08)
    end
    
    -- Arme folgen
    if joints.LeftShoulder then
        local target = originalCFrames.LeftShoulder * CFrame.Angles(
            -easedCycle * 0.4,
            0,
            easedCycle * 0.6
        )
        joints.LeftShoulder.C0 = joints.LeftShoulder.C0:Lerp(target, 0.08)
    end
    
    if joints.RightShoulder then
        local target = originalCFrames.RightShoulder * CFrame.Angles(
            -easedCycle * 0.4,
            0,
            -easedCycle * 0.6
        )
        joints.RightShoulder.C0 = joints.RightShoulder.C0:Lerp(target, 0.08)
    end
    
    -- Körper leicht nach vorne (Gegengewicht)
    if joints.Waist then
        local target = originalCFrames.Waist * CFrame.Angles(
            easedCycle * 0.25,
            0,
            0
        )
        joints.Waist.C0 = joints.Waist.C0:Lerp(target, 0.06)
    elseif joints.Root then
        local target = originalCFrames.Root * CFrame.Angles(
            easedCycle * 0.15,
            0,
            0
        )
        joints.Root.C0 = joints.Root.C0:Lerp(target, 0.06)
    end
    
    -- R15 Ellenbogen
    if joints.LeftElbow then
        joints.LeftElbow.C0 = joints.LeftElbow.C0:Lerp(
            originalCFrames.LeftElbow * CFrame.Angles(easedCycle * 0.3, 0, 0), 0.1
        )
    end
    if joints.RightElbow then
        joints.RightElbow.C0 = joints.RightElbow.C0:Lerp(
            originalCFrames.RightElbow * CFrame.Angles(easedCycle * 0.3, 0, 0), 0.1
        )
    end
end

--// =========================
--// DAB - Stilvoll dappen
--// =========================

local function animateDab(dt)
    local speed = (animationSpeed / 20) * 4
    animTime += dt * speed
    
    -- Einfahren (0-1) dann halten
    local enterPhase = math.min(animTime * 2, 1)
    local easedEnter = easeOutElastic(enterPhase)
    
    -- Leichte Atmung/Bounce nach dem Einfahren
    local bounce = 0
    if enterPhase >= 1 then
        bounce = math.sin((animTime - 0.5) * 3) * 0.05
    end
    
    -- Linker Arm hoch (Dab Pose)
    if joints.LeftShoulder then
        local target = originalCFrames.LeftShoulder * CFrame.Angles(
            -0.2 + bounce,
            0.3,
            2.2 * easedEnter + bounce -- Arm nach oben
        )
        joints.LeftShoulder.C0 = joints.LeftShoulder.C0:Lerp(target, 0.06)
    end
    
    -- Rechter Arm nach vorne
    if joints.RightShoulder then
        local target = originalCFrames.RightShoulder * CFrame.Angles(
            0.1 + bounce,
            -0.2,
            -1.0 * easedEnter - bounce
        )
        joints.RightShoulder.C0 = joints.RightShoulder.C0:Lerp(target, 0.06)
    end
    
    -- Kopf in den Arm rein
    if joints.Neck then
        local target = originalCFrames.Neck * CFrame.Angles(
            0.1 * easedEnter,
            -0.6 * easedEnter, -- Kopf nach links
            0.2 * easedEnter
        )
        joints.Neck.C0 = joints.Neck.C0:Lerp(target, 0.05)
    end
    
    -- Körper leicht gedreht
    if joints.Waist then
        local target = originalCFrames.Waist * CFrame.Angles(
            0,
            0,
            0.15 * easedEnter + bounce * 0.5
        )
        joints.Waist.C0 = joints.Waist.C0:Lerp(target, 0.05)
    elseif joints.Root then
        local target = originalCFrames.Root * CFrame.Angles(
            0,
            0.1 * easedEnter,
            0.1 * easedEnter
        )
        joints.Root.C0 = joints.Root.C0:Lerp(target, 0.05)
    end
    
    -- R15 Ellenbogen
    if joints.LeftElbow then
        joints.LeftElbow.C0 = joints.LeftElbow.C0:Lerp(
            originalCFrames.LeftElbow * CFrame.Angles(-0.5 * easedEnter, 0, 0), 0.08
        )
    end
    if joints.RightElbow then
        joints.RightElbow.C0 = joints.RightElbow.C0:Lerp(
            originalCFrames.RightElbow * CFrame.Angles(-0.3 * easedEnter, 0, 0), 0.08
        )
    end
end

--// =========================
--// PLAY / STOP
--// =========================

local function playAnimation()
    stopAnimation()
    if not char then return end
    
    getJoints()
    saveOriginalCFrames()
    animTime = 0
    smoothTime = 0
    
    animConn = RunService.PreRender:Connect(function(dt)
        if not animationToggle then 
            resetJoints()
            return 
        end
        
        if selectedAnimation == "Struggle" then
            animateStruggle(dt)
        elseif selectedAnimation == "Spasm" then
            animateSpasm(dt)
        elseif selectedAnimation == "Headthrow" then
            animateHeadthrow(dt)
        elseif selectedAnimation == "Dab" then
            animateDab(dt)
        end
    end)
end

local function stopAnimation()
    if animConn then
        animConn:Disconnect()
        animConn = nil
    end
    
    -- Smooth reset
    local resetConn = nil
    local resetTime = 0
    resetConn = RunService.PreRender:Connect(function(dt)
        resetTime += dt
        resetJoints()
        if resetTime > 0.5 then
            hardResetJoints()
            resetConn:Disconnect()
            resetConn = nil
        end
    end)
    
    animTime = 0
    smoothTime = 0
end

    --// =========================
    --// INSTANT APPLY ON RESPAWN
    --// =========================

    local function applyMods()
        if not hum or not HRP then return end

        if walkspeedToggleEnabled then
            startWalkSpeed()
        end

        if jumpPowerToggleEnabled then
            applyJumpPower()
        end

        if flightEnabled then
            startFlight()
        end

        if characterSpinEnabled then
            startSpin()
        end

        if noclipEnabled then
            startNoclip()
        end

        if infJumpEnabled then
            startInfJump()
        end

        if animationToggle then
            playAnimation()
        end
    end

    plr.CharacterAdded:Connect(function(c)
        char = c
        hum = c:WaitForChild("Humanoid", 5)
        HRP = c:WaitForChild("HumanoidRootPart", 5)

        stopWS()
        stopSpin()
        stopFly()
        stopNoclip()
        stopInfJump()
        stopSpectate()
        stopAnimation()

        task.wait(0.1)
        applyMods()
    end)

    --// =========================
    --// ═══════════════════════════════════════
    --// UI - VALUES SECTION
    --// ═══════════════════════════════════════
    --// =========================

    box:AddLabel("Values", true)

    box:AddSlider("WalkSpeedVal", {
        Text = "Walk Speed",
        Default = 249,
        Min = 0,
        Max = 10000,
        Rounding = 0,
        Callback = function(v)
            walkSpeedValue = v
        end
    })

    box:AddSlider("JumpPowerVal", {
        Text = "Jump Power",
        Default = 24,
        Min = 0,
        Max = 10000,
        Rounding = 0,
        Callback = function(v)
            jumpPowerValue = v
            if jumpPowerToggleEnabled then
                applyJumpPower()
            end
        end
    })

    box:AddSlider("FlightSpeedVal", {
        Text = "Flight Speed",
        Default = 20,
        Min = 0,
        Max = 200,
        Rounding = 0,
        Callback = function(v)
            flightSpeedValue = v
        end
    })

    box:AddSlider("SpinSpeedVal", {
        Text = "Spin Speed",
        Default = 214,
        Min = 0,
        Max = 1000,
        Rounding = 0,
        Callback = function(v)
            spinSpeedValue = v
        end
    })

    --// =========================
    --// ═══════════════════════════════════════
    --// UI - CHARACTER SECTION
    --// ═══════════════════════════════════════
    --// =========================

    box:AddLabel("Character", true)

    box:AddToggle("FlightToggle", {
        Text = "Flight",
        Default = false,
        Callback = function(v)
            flightEnabled = v
            if v then
                startFlight()
            else
                stopFly()
            end
        end
    })

    box:AddToggle("WalkspeedToggle", {
        Text = "Walkspeed",
        Default = false,
        Callback = function(v)
            walkspeedToggleEnabled = v
            if v then
                startWalkSpeed()
            else
                stopWS()
                if HRP then
                    HRP.AssemblyLinearVelocity = Vector3.zero
                end
            end
        end
    })

    box:AddToggle("JumpPowerToggle", {
        Text = "Jump Power",
        Default = false,
        Callback = function(v)
            jumpPowerToggleEnabled = v
            if v then
                applyJumpPower()
            else
                if hum then
                    hum.JumpPower = 50
                end
            end
        end
    })

    box:AddToggle("CharacterSpinToggle", {
        Text = "Character Spin",
        Default = false,
        Callback = function(v)
            characterSpinEnabled = v
            if v then
                startSpin()
            else
                stopSpin()
            end
        end
    })

    box:AddToggle("NoclipToggle", {
        Text = "Noclip",
        Default = false,
        Callback = function(v)
            noclipEnabled = v
            if v then
                startNoclip()
            else
                stopNoclip()
            end
        end
    })

    box:AddToggle("InfJumpToggle", {
        Text = "Inf Jump",
        Default = false,
        Callback = function(v)
            infJumpEnabled = v
            if v then
                startInfJump()
            else
                stopInfJump()
            end
        end
    })

    --// =========================
    --// ═══════════════════════════════════════
    --// UI - TELEPORTING SECTION
    --// ═══════════════════════════════════════
    --// =========================

    rightBox:AddLabel("Teleporting", true)

    -- Location Dropdown
    locationDropdown = rightBox:AddDropdown("LocationDropdown", {
        Text = "Location",
        Default = "---",
        Values = getLocationList(),
        Callback = function(v)
            selectedLocation = v
        end
    })

    rightBox:AddToggle("LoopTPLocation", {
        Text = "Loop TP to Location",
        Default = false,
        Callback = function(v)
            loopTPLocation = v
        end
    })

    -- Player Dropdown
    rightBox:AddLabel("Players", true)

    playerDropdown = rightBox:AddDropdown("PlayerDropdown", {
        Text = "Player",
        Default = "---",
        Values = getPlayerList(),
        Callback = function(v)
            selectedPlayer = v
        end
    })

    -- ═══════════════════════════════════════
    -- AUTO-UPDATE PLAYER DROPDOWN
    -- ═══════════════════════════════════════
    Players.PlayerAdded:Connect(function(newPlayer)
        if newPlayer ~= plr then
            local currentList = getPlayerList()
            if playerDropdown and playerDropdown.SetValues then
                playerDropdown:SetValues(currentList)
            elseif playerDropdown and playerDropdown.Refresh then
                playerDropdown:Refresh(currentList, false)
            elseif playerDropdown then
                -- Fallback: Direktes Update
                playerDropdown.Values = currentList
            end
        end
    end)

    Players.PlayerRemoving:Connect(function(leftPlayer)
        if leftPlayer ~= plr then
            local currentList = getPlayerList()
            if playerDropdown and playerDropdown.SetValues then
                playerDropdown:SetValues(currentList)
            elseif playerDropdown and playerDropdown.Refresh then
                playerDropdown:Refresh(currentList, false)
            elseif playerDropdown then
                playerDropdown.Values = currentList
            end
            
            if selectedPlayer == leftPlayer.Name then
                selectedPlayer = nil
                if playerDropdown and playerDropdown.SetValue then
                    playerDropdown:SetValue("---")
                end
            end
        end
    end)
    -- ═══════════════════════════════════════

    rightBox:AddToggle("SpectatePlayer", {
        Text = "Spectate Player",
        Default = false,
        Callback = function(v)
            spectatePlayer = v
            if v then
                startSpectate()
            else
                stopSpectate()
            end
        end
    })

    rightBox:AddToggle("LoopTPPlayer", {
        Text = "Loop TP to Player",
        Default = false,
        Callback = function(v)
            loopTPPlayer = v
        end
    })

    --// =========================
    --// ═══════════════════════════════════════
    --// UI - ANIMATIONS SECTION
    --// ═══════════════════════════════════════
    --// =========================

    rightBox2:AddLabel("Animations", true)

    rightBox2:AddDropdown("AnimationDropdown", {
        Text = "Animation to Play",
        Default = "Struggle",
        Values = animationList,
        Callback = function(v)
            selectedAnimation = v
            if animationToggle then
                playAnimation()
            end
        end
    })

    rightBox2:AddSlider("AnimationSpeed", {
        Text = "Animation Speed",
        Default = 1,
        Min = 0,
        Max = 20,
        Rounding = 0,
        Callback = function(v)
            animationSpeed = v
            if currentAnimTrack then
                currentAnimTrack:AdjustSpeed(v / 20)
            end
        end
    })

    rightBox2:AddToggle("ToggleAnimation", {
        Text = "Toggle Animation",
        Default = false,
        Callback = function(v)
            animationToggle = v
            if v then
                playAnimation()
            else
                stopAnimation()
            end
        end
    })

end


-- ==================== MISC TAB ====================
do
    --// SERVICES
    local Players = game:GetService("Players")
    local RunService = game:GetService("RunService")
    local UserInputService = game:GetService("UserInputService")
    local Workspace = game:GetService("Workspace")
    local ReplicatedStorage = game:GetService("ReplicatedStorage")
    local TweenService = game:GetService("TweenService")
    local SoundService = game:GetService("SoundService")
    local Lighting = game:GetService("Lighting")
    local TeleportService = game:GetService("TeleportService")
    local HttpService = game:GetService("HttpService")
    local ContextActionService = game:GetService("ContextActionService")
    local Stats = game:GetService("Stats")
    local StarterGui = game:GetService("StarterGui")
    
    local plr = Players.LocalPlayer
    local Mouse = plr:GetMouse()
    local Camera = workspace.CurrentCamera
    
    --// REMOTES
    local rs = ReplicatedStorage
    local DestroyToy = rs.MenuToys.DestroyToy
    local SetNetOwner = rs.GrabEvents.SetNetworkOwner
    local CreateLine = rs.GrabEvents.CreateGrabLine
    local DestroyLine = rs.GrabEvents.DestroyGrabLine
    local SpawnToy = rs.MenuToys.SpawnToyRemoteFunction
    local Struggle = rs.CharacterEvents.Struggle
    local Ragdoll = rs.CharacterEvents.RagdollRemote
    local StopVel = rs.GameCorrectionEvents.StopAllVelocity
    
    --// CHARACTER REFS
    local char = plr.Character
    local HRP = char and char:FindFirstChild("HumanoidRootPart")
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    
    plr.CharacterAdded:Connect(function(c)
        task.wait(0.1)
        char = c
        HRP = c:FindFirstChild("HumanoidRootPart") or c:WaitForChild("HumanoidRootPart", 1)
        hum = c:FindFirstChildOfClass("Humanoid") or c:WaitForChild("Humanoid", 1)
    end)
    
    --// HELPER FUNCTIONS
    local function sno(obj)
        SetNetOwner:FireServer(obj, obj.CFrame)
    end
    
    local function stvel(hrp)
        if hrp then
            hrp.AssemblyLinearVelocity = Vector3.zero
            hrp.AssemblyAngularVelocity = Vector3.zero
        end
    end
    
    local function getplot()
        for i = 1, 5 do
            local plot = workspace.Plots:FindFirstChild("Plot" .. i)
            if plot then
                local value = plot.PlotSign.ThisPlotsOwners:FindFirstChild("Value")
                if value and value.Value:find(plr.Name) then
                    return plot
                end
            end
        end
    end
    
    local function spawntoy(toy, cf)
        if not plr.CanSpawnToy.Value then
            plr.CanSpawnToy.Changed:Wait()
        end
        local t
        local toyadded
        local inv = workspace[plr.Name .. "SpawnedInToys"]
        toyadded = inv.ChildAdded:Connect(function(c)
            if c.Name == toy then
                t = c
                toyadded:Disconnect()
            end
        end)
        task.spawn(function()
            SpawnToy:InvokeServer(toy, cf, Vector3.new(0, 0, 0))
        end)
        local time = tick() + 1
        repeat task.wait() until t or tick() > time
        if t then
            return t
        else
            local plot = getplot()
            if plot then
                return workspace.PlotItems[plot.Name]:FindFirstChild(toy) or workspace.PlotItems[plot.Name]:WaitForChild(toy, 0.5)
            end
        end
    end
    
    --// ============================================
    --// LINKE SEITE - GAMEPASSES
    --// ============================================
    local gamepassBox = Tabs.Misc:AddLeftGroupbox("Gamepasses")
    
    gamepassBox:AddToggle("FurtherReachLine", {
    Text = "Further Reach Line (33 Studs)",
    Default = false,
    Callback = function(v)
        if v then
            cons["furtherreach"] = RunService.RenderStepped:Connect(function()
                if not HRP or not HRP.Parent then return end
                
                local grabParts = workspace:FindFirstChild("GrabParts")
                if not grabParts then return end
                
                local dragPart = grabParts:FindFirstChild("DragPart")
                if not dragPart then return end
                
                -- AlignPosition für maximale Reichweite
                local alignPos = dragPart:FindFirstChild("AlignPosition")
                if alignPos then
                    alignPos.MaxForce = math.huge
                    alignPos.Responsiveness = 200
                    alignPos.MaxVelocity = math.huge
                end
                
                -- AlignOrientation für schnelle Rotation
                local alignOri = dragPart:FindFirstChild("AlignOrientation")
                if alignOri then
                    alignOri.MaxTorque = math.huge
                    alignOri.Responsiveness = 200
                end
                
                -- GRABBEAM/GRABLINE LÄNGE = 33 STUDS
                for _, desc in ipairs(grabParts:GetDescendants()) do
                    if desc:IsA("Beam") and (desc.Name == "GrabBeam" or desc.Name == "GrabLine") then
                        -- Attachment1 auf 33 Studs vor dem Spieler setzen
                        if desc.Attachment0 and desc.Attachment1 then
                            local handPos = desc.Attachment0.WorldPosition
                            local targetDir = (HRP.CFrame.LookVector * 33)
                            desc.Attachment1.WorldPosition = handPos + targetDir
                        end
                        
                        -- Visual
                        desc.Width0 = 0.15
                        desc.Width1 = 0.15
                        desc.Segments = 33
                        desc.LightEmission = 0.5
                    end
                end
                
                -- DragPart direkt auf 33 Studs setzen
                local targetPos = HRP.Position + (HRP.CFrame.LookVector * 33)
                dragPart.CFrame = CFrame.new(targetPos)
                dragPart.AssemblyLinearVelocity = Vector3.zero
                dragPart.AssemblyAngularVelocity = Vector3.zero
            end)
        else
            if cons["furtherreach"] then
                cons["furtherreach"]:Disconnect()
                cons["furtherreach"] = nil
            end
            
            -- Zurücksetzen
            local grabParts = workspace:FindFirstChild("GrabParts")
            if grabParts then
                for _, desc in ipairs(grabParts:GetDescendants()) do
                    if desc:IsA("Beam") then
                        desc.Width0 = 0.1
                        desc.Width1 = 0.1
                        desc.Segments = 10
                    end
                    if desc:IsA("AlignPosition") then
                        desc.MaxForce = 50000
                        desc.Responsiveness = 100
                        desc.MaxVelocity = 50
                    end
                end
            end
        end
    end
})
    
    -- Gradient Line
    gamepassBox:AddToggle("GradientLine", {
        Text = "Gradient Line",
        Default = false,
        Callback = function(v)
            if v then
                local function colorBeam(beam)
                    if beam:IsA("Beam") then
                        beam.Color = ColorSequence.new({
                            ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 0, 255)),
                            ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 255, 255)),
                            ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 255, 0))
                        })
                        beam.Width0 = 0.3
                        beam.Width1 = 0.1
                    end
                end
                
                cons["gradientline"] = workspace.DescendantAdded:Connect(function(d)
                    if d.Name == "GrabBeam" or d.Name == "GrabLine" then
                        colorBeam(d)
                    end
                end)
                for _, d in pairs(workspace:GetDescendants()) do
                    if d.Name == "GrabBeam" or d.Name == "GrabLine" then
                        colorBeam(d)
                    end
                end
            else
                if cons["gradientline"] then
                    cons["gradientline"]:Disconnect()
                    cons["gradientline"] = nil
                end
            end
        end
    })
    
    -- Faster Escape
    gamepassBox:AddToggle("FasterEscape", {
        Text = "Faster Escape",
        Default = false,
        Callback = function(v)
            if v then
                cons["fasterescape"] = plr.CharacterAdded:Connect(function(c)
                    local h = c:WaitForChild("Humanoid", 2)
                    if h then
                        h:GetPropertyChangedSignal("WalkSpeed"):Connect(function()
                            if Toggles.FasterEscape.Value and h.WalkSpeed < 16 then
                                h.WalkSpeed = 16
                            end
                        end)
                    end
                end)
                if hum then
                    hum.WalkSpeed = math.max(hum.WalkSpeed, 16)
                end
            else
                if cons["fasterescape"] then
                    cons["fasterescape"]:Disconnect()
                    cons["fasterescape"] = nil
                end
            end
        end
    })
    
    --// ============================================
    --// LINKE SEITE - AUTO
    --// ============================================
    local autoBox = Tabs.Misc:AddLeftGroupbox("Auto")
    
    -- Auto-House Teleport
    autoBox:AddToggle("AutoHouseTeleport", {
        Text = "Auto-House Teleport",
        Default = false,
        Callback = function(v)
            if v then
                task.spawn(function()
                    while Toggles.AutoHouseTeleport.Value do
                        task.wait(1)
                        local plot = getplot()
                        if plot and HRP then
                            local housePos = plot:FindFirstChild("HouseSpawn") or plot:FindFirstChild("SpawnLocation")
                            if housePos then
                                local dist = (HRP.Position - housePos.Position).Magnitude
                                if dist > 100 then
                                    HRP.CFrame = housePos.CFrame
                                    stvel(HRP)
                                end
                            end
                        end
                    end
                end)
            end
        end
    })
    
    -- Auto-Slots
    autoBox:AddToggle("AutoFling", {
    Text = "Auto-Fling (FTP)",
    Default = false,
    Callback = function(v)
        if v then
            task.spawn(function()
                while Toggles.AutoFling.Value do
                    task.wait(0.1)
                    
                    local Character = LocalPlayer.Character
                    local HRP = Character and Character:FindFirstChild("HumanoidRootPart")
                    if not HRP then continue end
                    
                    local closestTarget = nil
                    local closestDist = math.huge
                    local targetPart = nil
                    
                    -- ============================================
                    -- 1. ZIELE FINDEN (Spieler, NPCs, Items)
                    -- ============================================
                    
                    -- Spieler als Ziele
                    for _, player in pairs(Players:GetPlayers()) do
                        if player ~= LocalPlayer and player.Character then
                            local targetHRP = player.Character:FindFirstChild("HumanoidRootPart")
                            if targetHRP then
                                local dist = (targetHRP.Position - HRP.Position).Magnitude
                                if dist < closestDist and dist < 50 then
                                    closestDist = dist
                                    closestTarget = player.Character
                                    targetPart = targetHRP
                                end
                            end
                        end
                    end
                    
                    -- Items/Toys als Ziele
                    for _, obj in pairs(workspace:GetDescendants()) do
                        if obj:IsA("BasePart") and not obj:IsDescendantOf(LocalPlayer.Character) then
                            local name = obj.Name:lower()
                            -- FTP typische Item-Namen
                            if name:find("toy") or 
                               name:find("item") or 
                               name:find("ball") or 
                               name:find("box") or
                               name:find("dummie") or
                               name:find("npc") or
                               name:find("man") or
                               name:find("ragdoll") or
                               obj:FindFirstChildOfClass("Humanoid") then
                                
                                local dist = (obj.Position - HRP.Position).Magnitude
                                if dist < closestDist and dist < 50 then
                                    closestDist = dist
                                    closestTarget = obj
                                    targetPart = obj:IsA("BasePart") and obj or obj:FindFirstChildWhichIsA("BasePart")
                                end
                            end
                        end
                    end
                    
                    if not closestTarget or not targetPart then continue end
                    
                    -- ============================================
                    -- 2. ZU ZIEL TELEPORTIEREN (Nahe kommen)
                    -- ============================================
                    
                    if closestDist > 8 then
                        local targetPos = targetPart.Position
                        local direction = (targetPos - HRP.Position).Unit
                        local teleportPos = targetPos - (direction * 6)
                        HRP.CFrame = CFrame.new(teleportPos, targetPos)
                        task.wait(0.15)
                    end
                    
                    -- ============================================
                    -- 3. FTP GRAB & FLING MECHANIK
                    -- ============================================
                    
                    local flinged = false
                    
                    -- Methode 1: Tool-basiertes Grab (FTP Standard)
                    pcall(function()
                        local backpack = LocalPlayer:FindFirstChild("Backpack")
                        local character = LocalPlayer.Character
                        
                        -- Suche nach Grab/Hand Tool
                        local grabTool = character:FindFirstChild("Grab") or 
                                        character:FindFirstChild("Hand") or
                                        backpack:FindFirstChild("Grab") or
                                        backpack:FindFirstChild("Hand")
                        
                        if grabTool then
                            grabTool.Parent = character
                            task.wait(0.1)
                            
                            -- Aktiviere Tool auf Ziel
                            local toolHandle = grabTool:FindFirstChild("Handle")
                            if toolHandle then
                                toolHandle.CFrame = targetPart.CFrame
                                task.wait(0.1)
                            end
                            
                            -- RemoteEvent für Grab (FTP typisch)
                            local grabEvent = grabTool:FindFirstChild("Grab") or 
                                              grabTool:FindFirstChild("GrabRemote") or
                                              grabTool:FindFirstChild("RemoteEvent")
                            
                            if grabEvent and grabEvent:IsA("RemoteEvent") then
                                grabEvent:FireServer(targetPart)
                                task.wait(0.2)
                            end
                            
                            flinged = true
                        end
                    end)
                    
                    -- Methode 2: Direkte Remote-Events (FTP Server-Side)
                    if not flinged then
                        pcall(function()
                            local ReplicatedStorage = game:GetService("ReplicatedStorage")
                            
                            -- Typische FTP Remote-Names
                            local remotes = {
                                "Grab",
                                "GrabItem", 
                                "Fling",
                                "Throw",
                                "Interact",
                                "Click",
                                "MouseClick"
                            }
                            
                            for _, remoteName in pairs(remotes) do
                                local remote = ReplicatedStorage:FindFirstChild(remoteName, true) or
                                              workspace:FindFirstChild(remoteName, true)
                                
                                if remote and remote:IsA("RemoteEvent") then
                                    remote:FireServer(targetPart, HRP.Position + Vector3.new(0, 50, 0))
                                    flinged = true
                                    task.wait(0.2)
                                    break
                                end
                                
                                if remote and remote:IsA("RemoteFunction") then
                                    remote:InvokeServer(targetPart, HRP.Position + Vector3.new(0, 100, 0))
                                    flinged = true
                                    task.wait(0.2)
                                    break
                                end
                            end
                        end)
                    end
                    
                    -- Methode 3: Physics-Manipulation (Client-Side Fling)
                    if not flinged and targetPart then
                        pcall(function()
                            -- Setze Ziel in die Luft (nur Client-Side, weniger effektiv)
                            local bodyVelocity = Instance.new("BodyVelocity")
                            bodyVelocity.Velocity = (HRP.CFrame.LookVector * 200) + Vector3.new(0, 150, 0)
                            bodyVelocity.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
                            bodyVelocity.Parent = targetPart
                            
                            local bodyGyro = Instance.new("BodyGyro")
                            bodyGyro.MaxTorque = Vector3.new(math.huge, math.huge, math.huge)
                            bodyGyro.Parent = targetPart
                            
                            task.wait(0.3)
                            
                            bodyVelocity:Destroy()
                            bodyGyro:Destroy()
                            
                            flinged = true
                        end)
                    end
                    
                    -- Methode 4: ClickDetector / ProximityPrompt (Interaktion)
                    if not flinged then
                        pcall(function()
                            local clickDetector = closestTarget:FindFirstChildWhichIsA("ClickDetector") or
                                                targetPart:FindFirstChildWhichIsA("ClickDetector")
                            
                            if clickDetector then
                                fireclickdetector(clickDetector)
                                flinged = true
                                task.wait(0.2)
                            end
                            
                            local prompt = closestTarget:FindFirstChildWhichIsA("ProximityPrompt") or
                                          targetPart:FindFirstChildWhichIsA("ProximityPrompt")
                            
                            if prompt then
                                prompt:InputHoldBegin()
                                task.wait(0.2)
                                prompt:InputHoldEnd()
                                flinged = true
                            end
                        end)
                    end
                    
                    -- ============================================
                    -- 4. WERFEN / SCHLEUDERN (Fling)
                    -- ============================================
                    
                    if flinged then
                        pcall(function()
                            task.wait(0.2)
                            
                            -- Simuliere Wurf-Bewegung
                            local VirtualUser = game:GetService("VirtualUser")
                            local VirtualInput = game:GetService("VirtualInputManager")
                            
                            -- Schnelle Mausbewegung = Wurf
                            local viewport = workspace.CurrentCamera.ViewportSize
                            local center = Vector2.new(viewport.X / 2, viewport.Y / 2)
                            
                            -- "Wirf" nach oben
                            VirtualUser:CaptureController()
                            VirtualUser:ClickButton1(center)
                            task.wait(0.05)
                            
                            -- Simuliere schnelle Mausbewegung nach oben
                            VirtualInput:SendMouseMoveEvent(0, -200, game)
                            task.wait(0.1)
                            
                            VirtualUser:ClickButton1(Vector2.new(center.X, center.Y - 100))
                            task.wait(0.1)
                            
                            -- E-Taste für Aktion
                            VirtualInput:SendKeyEvent(true, "E", false, game)
                            task.wait(0.1)
                            VirtualInput:SendKeyEvent(false, "E", false, game)
                            
                            -- Space für Sprung-Wurf
                            VirtualInput:SendKeyEvent(true, "Space", false, game)
                            task.wait(0.1)
                            VirtualInput:SendKeyEvent(false, "Space", false, game)
                        end)
                    end
                    
                    -- Cooldown vor nächstem Ziel
                    task.wait(1.5)
                end
            end)
        end
    end
})
    
--// ============================================
--// LINKE SEITE - TRIGGERBOT (EINMAL PRO ZIEL)
--// ============================================
local triggerBox = Tabs.Misc:AddLeftGroupbox("Triggerbot")

-- Variablen
local triggerbotEnabled = false
local triggerbotDelay = 0.05
local triggerbotDistance = 33
local triggerbotTargetTeam = "Both"
local hasShotAtCurrentTarget = false  -- WICHTIG: Trackt ob wir schon auf DIESES Ziel geschossen haben
local currentTarget = nil

-- Raycast Helper
local function getTriggerbotTarget()
    local cam = Camera
    local rayOrigin = cam.CFrame.Position
    local rayDirection = cam.CFrame.LookVector * triggerbotDistance
    
    local raycastParams = RaycastParams.new()
    raycastParams.FilterDescendantsInstances = {char}
    raycastParams.FilterType = Enum.RaycastFilterType.Blacklist
    
    local result = workspace:Raycast(rayOrigin, rayDirection, raycastParams)
    
    if result then
        local hitModel = result.Instance:FindFirstAncestorOfClass("Model")
        if hitModel then
            local targetPlayer = Players:GetPlayerFromCharacter(hitModel)
            if targetPlayer and targetPlayer ~= plr then
                local targetHum = hitModel:FindFirstChildOfClass("Humanoid")
                if targetHum and targetHum.Health > 0 then
                    local isBeast = targetHum:FindFirstChild("Beast") or (targetPlayer.Team and targetPlayer.Team.Name:lower():find("beast"))
                    
                    if triggerbotTargetTeam == "Both" then
                        return targetPlayer
                    elseif triggerbotTargetTeam == "Beast" and isBeast then
                        return targetPlayer
                    elseif triggerbotTargetTeam == "Survivor" and not isBeast then
                        return targetPlayer
                    end
                end
            end
        end
    end
    return nil
end

-- Klick Funktion
local function doClick()
    mouse1press()
    task.wait(0.05)
    mouse1release()
end

-- Haupt-Loop
local function triggerbotLoop()
    while triggerbotEnabled do
        task.wait(0.01)
        
        local target = getTriggerbotTarget()
        
        if target then
            -- Wenn wir ein Ziel haben
            if currentTarget ~= target then
                -- NEUES Ziel -> Reset und schießen
                currentTarget = target
                hasShotAtCurrentTarget = false
            end
            
            -- Nur schießen wenn wir auf dieses Ziel NOCH NICHT geschossen haben
            if not hasShotAtCurrentTarget then
                doClick()
                hasShotAtCurrentTarget = true
                
                if Library and Library.Notify then
                    Library:Notify("🔫 Shot at " .. target.Name, 0.5)
                end
                
                -- Kurze Pause nach dem Schuss
                task.wait(triggerbotDelay)
            end
        else
            -- Kein Ziel -> Reset für nächstes Ziel
            currentTarget = nil
            hasShotAtCurrentTarget = false
        end
    end
end

-- Toggle Button
triggerBox:AddToggle("TriggerbotToggle", {
    Text = "Enable Triggerbot",
    Default = false,
    Callback = function(v)
        triggerbotEnabled = v
        if v then
            currentTarget = nil
            hasShotAtCurrentTarget = false
            task.spawn(triggerbotLoop)
            if Library and Library.Notify then
                Library:Notify("✅ Triggerbot ENABLED", 1)
            end
        else
            if Library and Library.Notify then
                Library:Notify("❌ Triggerbot DISABLED", 1)
            end
        end
    end
})

triggerBox:AddLabel("Configuration", true)

triggerBox:AddDropdown("TriggerbotTargetTeam", {
    Text = "Target Team",
    Values = {"Both", "Beast", "Survivor"},
    Default = 1,
    Multi = false,
    Callback = function(v)
        triggerbotTargetTeam = v
    end
})

triggerBox:AddSlider("TriggerbotDelay", {
    Text = "Shot Delay",
    Default = 0.05,
    Min = 0,
    Max = 1,
    Rounding = 2,
    Suffix = " sec",
    Callback = function(v)
        triggerbotDelay = v
    end
})

triggerBox:AddSlider("TriggerbotDistance", {
    Text = "Max Distance",
    Default = 33,
    Min = 5,
    Max = 100,
    Rounding = 0,
    Suffix = " studs",
    Callback = function(v)
        triggerbotDistance = v
    end
})
    
    --// ============================================
    --// RECHTE SEITE - SOUND SPAM (VERBSSERT)
    --// ============================================
    local soundBox = Tabs.Misc:AddRightGroupbox("Sound Spam")
    
    local soundSpamActive = false
    local soundSpamDelay = 0.1
    local soundSpamVolume = 2
    local soundSpamPitch = 1
    local soundSpamRandom = false
    local selectedSounds = {"Oi", "Mountain", "Oops"}
    
    local SOUND_IDS = {
        ["Oi"] = "rbxassetid://12222170",
        ["Mountain"] = "rbxassetid://12222124",
        ["Oops"] = "rbxassetid://12222192",
        ["Oi, Mountain, Oops"] = "rbxassetid://12222170"
    }
    
    soundBox:AddDropdown("SoundsToSpam", {
        Text = "Sounds to spam",
        Values = {"Oi", "Mountain", "Oops", "Oi, Mountain, Oops", "Random"},
        Default = 4,
        Multi = false,
        Callback = function(v)
            if v == "Oi, Mountain, Oops" then
                selectedSounds = {"Oi", "Mountain", "Oops"}
            elseif v == "Random" then
                soundSpamRandom = true
                selectedSounds = {"Oi", "Mountain", "Oops"}
            else
                soundSpamRandom = false
                selectedSounds = {v}
            end
        end
    })
    
    soundBox:AddSlider("SoundSpamDelay", {
        Text = "Delay",
        Default = 0.1,
        Min = 0.01,
        Max = 2,
        Rounding = 2,
        Callback = function(v)
            soundSpamDelay = v
        end
    })
    
    soundBox:AddSlider("SoundSpamVolume", {
        Text = "Volume",
        Default = 2,
        Min = 0.1,
        Max = 10,
        Rounding = 1,
        Callback = function(v)
            soundSpamVolume = v
        end
    })
    
    soundBox:AddSlider("SoundSpamPitch", {
        Text = "Pitch",
        Default = 1,
        Min = 0.1,
        Max = 3,
        Rounding = 2,
        Callback = function(v)
            soundSpamPitch = v
        end
    })
    
    soundBox:AddToggle("SoundSpamToggle", {
        Text = "Sound Spam",
        Default = false,
        Callback = function(v)
            soundSpamActive = v
            if v then
                task.spawn(function()
                    local soundIndex = 1
                    while soundSpamActive do
                        if not soundSpamActive then break end
                        
                        local soundName
                        if soundSpamRandom then
                            soundName = selectedSounds[math.random(1, #selectedSounds)]
                        else
                            soundName = selectedSounds[soundIndex]
                        end
                        
                        local soundId = SOUND_IDS[soundName] or SOUND_IDS["Oi"]
                        
                        pcall(function()
                            local sound = Instance.new("Sound")
                            sound.SoundId = soundId
                            sound.Volume = soundSpamVolume
                            sound.PlaybackSpeed = soundSpamPitch
                            sound.Parent = HRP or workspace
                            sound:Play()
                            game:GetService("Debris"):AddItem(sound, 2)
                        end)
                        
                        if not soundSpamRandom then
                            soundIndex = soundIndex + 1
                            if soundIndex > #selectedSounds then
                                soundIndex = 1
                            end
                        end
                        
                        task.wait(soundSpamDelay)
                    end
                end)
            end
        end
    })
    
    --// ============================================
    --// RECHTE SEITE - AIMBOT (MASSIV VERBESSERT)
    --// ============================================
    local aimbotBox = Tabs.Misc:AddRightGroupbox("Aimbot")
    
    local aimbotActive = false
    local aimbotTargetPart = "Head"
    local aimbotAlwaysOn = false
    local aimbotFOVCircle = false
    local aimbotDistance = 40
    local aimbotSmoothness = 0.15
    local aimbotFOVRadius = 150
    local aimbotKeybind = Enum.KeyCode.LeftShift
    local aimbotHolding = false
    local aimbotTargetTeam = "Both"
    local aimbotWallCheck = false
    local aimbotPrediction = false
    local aimbotPredictionFactor = 0.1
    local aimbotCurrentTarget = nil
    
    -- FOV Circle
    local fovCircle = Drawing.new("Circle")
    fovCircle.Visible = false
    fovCircle.Thickness = 1.5
    fovCircle.Color = Color3.fromRGB(255, 255, 255)
    fovCircle.Filled = false
    fovCircle.NumSides = 64
    fovCircle.Transparency = 1
    
    local fovCircleFilled = Drawing.new("Circle")
    fovCircleFilled.Visible = false
    fovCircleFilled.Thickness = 0
    fovCircleFilled.Color = Color3.fromRGB(255, 255, 255)
    fovCircleFilled.Filled = true
    fovCircleFilled.NumSides = 64
    fovCircleFilled.Transparency = 0.1
    
    -- Snapline
    local snapLine = Drawing.new("Line")
    snapLine.Visible = false
    snapLine.Thickness = 1
    snapLine.Color = Color3.fromRGB(255, 255, 255)
    snapLine.Transparency = 0.5
    
    local function getAimbotTarget()
        local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)
        local closestTarget = nil
        local closestDist = math.huge
        
        for _, player in pairs(Players:GetPlayers()) do
            if player ~= plr and player.Character then
                local targetChar = player.Character
                local targetHum = targetChar:FindFirstChildOfClass("Humanoid")
                
                if targetHum and targetHum.Health > 0 then
                    -- Team Check
                    local isBeast = targetHum:FindFirstChild("Beast") or (player.Team and player.Team.Name:lower():find("beast"))
                    local shouldTarget = false
                    
                    if aimbotTargetTeam == "Both" then
                        shouldTarget = true
                    elseif aimbotTargetTeam == "Beast" and isBeast then
                        shouldTarget = true
                    elseif aimbotTargetTeam == "Survivor" and not isBeast then
                        shouldTarget = true
                    end
                    
                    if shouldTarget then
                        local targetPart = targetChar:FindFirstChild(aimbotTargetPart) or targetChar:FindFirstChild("Head") or targetChar:FindFirstChild("HumanoidRootPart")
                        
                        if targetPart then
                            -- Wall Check
                            if aimbotWallCheck then
                                local rayOrigin = Camera.CFrame.Position
                                local rayDirection = (targetPart.Position - rayOrigin).Unit * (targetPart.Position - rayOrigin).Magnitude
                                local raycastParams = RaycastParams.new()
                                raycastParams.FilterDescendantsInstances = {char, targetChar}
                                raycastParams.FilterType = Enum.RaycastFilterType.Blacklist
                                local wallResult = workspace:Raycast(rayOrigin, rayDirection, raycastParams)
                                if wallResult then
                                    continue
                                end
                            end
                            
                            local screenPos, onScreen = Camera:WorldToViewportPoint(targetPart.Position)
                            local screenVec = Vector2.new(screenPos.X, screenPos.Y)
                            local distFromCenter = (screenVec - screenCenter).Magnitude
                            local worldDist = (targetPart.Position - (HRP and HRP.Position or Vector3.zero)).Magnitude
                            
                            if onScreen and distFromCenter <= aimbotFOVRadius and worldDist <= aimbotDistance then
                                if distFromCenter < closestDist then
                                    closestDist = distFromCenter
                                    closestTarget = {
                                        Player = player,
                                        Character = targetChar,
                                        Part = targetPart,
                                        ScreenPos = screenVec,
                                        WorldPos = targetPart.Position,
                                        Velocity = targetPart.AssemblyLinearVelocity or Vector3.zero
                                    }
                                end
                            end
                        end
                    end
                end
            end
        end
        
        return closestTarget
    end
    
    aimbotBox:AddToggle("AimbotToggle", {
        Text = "Toggle",
        Default = false,
        Callback = function(v)
            aimbotActive = v
            if v then
                task.spawn(function()
                    while aimbotActive do
                        task.wait()
                        if not aimbotActive then break end
                        
                        local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)
                        
                        -- Update FOV Visuals
                        fovCircle.Position = screenCenter
                        fovCircle.Radius = aimbotFOVRadius
                        fovCircle.Visible = aimbotFOVCircle
                        
                        fovCircleFilled.Position = screenCenter
                        fovCircleFilled.Radius = aimbotFOVRadius
                        fovCircleFilled.Visible = aimbotFOVCircle
                        
                        -- Aimbot aktiv?
                        local shouldAim = aimbotAlwaysOn or aimbotHolding
                        
                        if shouldAim then
                            local target = getAimbotTarget()
                            aimbotCurrentTarget = target
                            
                            if target then
                                -- Prediction
                                local targetPos = target.WorldPos
                                if aimbotPrediction then
                                    targetPos = targetPos + (target.Velocity * aimbotPredictionFactor)
                                end
                                
                                -- Smooth aim
                                local camCF = Camera.CFrame
                                local targetCF = CFrame.new(camCF.Position, targetPos)
                                Camera.CFrame = camCF:Lerp(targetCF, aimbotSmoothness)
                                
                                -- Update Snapline
                                snapLine.From = screenCenter
                                snapLine.To = target.ScreenPos
                                snapLine.Visible = true
                                snapLine.Color = Color3.fromRGB(0, 255, 100)
                                
                                -- FOV Circle Farbe ändern wenn Ziel erfasst
                                fovCircle.Color = Color3.fromRGB(0, 255, 100)
                                fovCircleFilled.Color = Color3.fromRGB(0, 255, 100)
                            else
                                snapLine.Visible = false
                                fovCircle.Color = Color3.fromRGB(255, 255, 255)
                                fovCircleFilled.Color = Color3.fromRGB(255, 255, 255)
                            end
                        else
                            snapLine.Visible = false
                            aimbotCurrentTarget = nil
                            fovCircle.Color = Color3.fromRGB(255, 255, 255)
                            fovCircleFilled.Color = Color3.fromRGB(255, 255, 255)
                        end
                    end
                    
                    -- Cleanup
                    fovCircle.Visible = false
                    fovCircleFilled.Visible = false
                    snapLine.Visible = false
                end)
            else
                fovCircle.Visible = false
                fovCircleFilled.Visible = false
                snapLine.Visible = false
            end
        end
    })
    
    aimbotBox:AddLabel("Configuration", true)
    
    -- Aimbot Keybind
    aimbotBox:AddLabel("Aim Key"):AddKeyPicker("AimbotKey", {
        Default = "LeftShift",
        NoUI = false,
        Text = "Aimbot Key",
        Mode = "Hold",
        Callback = function(v)
            aimbotHolding = v
        end
    })
    
    aimbotBox:AddDropdown("AimbotTargetPart", {
        Text = "Target Part",
        Values = {"Head", "Torso", "HumanoidRootPart", "LeftLeg", "RightLeg"},
        Default = 1,
        Multi = false,
        Callback = function(v)
            aimbotTargetPart = v
        end
    })
    
    aimbotBox:AddDropdown("AimbotTargetTeam", {
        Text = "Target Team",
        Values = {"Both", "Beast", "Survivor"},
        Default = 1,
        Multi = false,
        Callback = function(v)
            aimbotTargetTeam = v
        end
    })
    
    aimbotBox:AddToggle("AimbotAlwaysOn", {
        Text = "Always On",
        Default = false,
        Callback = function(v)
            aimbotAlwaysOn = v
        end
    })
    
    aimbotBox:AddToggle("AimbotFOVCircle", {
        Text = "FOV Circle",
        Default = false,
        Callback = function(v)
            aimbotFOVCircle = v
        end
    })
    
    aimbotBox:AddToggle("AimbotWallCheck", {
        Text = "Wall Check",
        Default = false,
        Callback = function(v)
            aimbotWallCheck = v
        end
    })
    
    aimbotBox:AddToggle("AimbotPrediction", {
        Text = "Movement Prediction",
        Default = false,
        Callback = function(v)
            aimbotPrediction = v
        end
    })
    
    aimbotBox:AddSlider("AimbotDistance", {
        Text = "Distance",
        Default = 40,
        Min = 10,
        Max = 500,
        Rounding = 0,
        Suffix = " studs",
        Callback = function(v)
            aimbotDistance = v
        end
    })
    
    aimbotBox:AddSlider("AimbotSmoothness", {
        Text = "Smoothness",
        Default = 0.15,
        Min = 0.01,
        Max = 1,
        Rounding = 2,
        Callback = function(v)
            aimbotSmoothness = v
        end
    })
    
    aimbotBox:AddSlider("AimbotFOVRadius", {
        Text = "FOV Radius",
        Default = 150,
        Min = 50,
        Max = 800,
        Rounding = 0,
        Callback = function(v)
            aimbotFOVRadius = v
        end
    })
    
    aimbotBox:AddSlider("AimbotPredictionFactor", {
        Text = "Prediction Factor",
        Default = 0.1,
        Min = 0,
        Max = 1,
        Rounding = 2,
        Callback = function(v)
            aimbotPredictionFactor = v
        end
    })
    
    --// ============================================
    --// CLEANUP
    --// ============================================
    local oldUnload = Library.Unload
    Library.Unload = function(...)
        if fovCircle then fovCircle:Destroy() end
        if fovCircleFilled then fovCircleFilled:Destroy() end
        if snapLine then snapLine:Destroy() end
        if oldUnload then oldUnload(...) end
    end
end


-- ==================== Target - Blobman ====================
do
    -- WICHTIG: Lokale Absicherung der Services und deines Charakters, damit die GUI nicht abstürzt
    local Players = game:GetService("Players")
    local ReplicatedStorage = game:GetService("ReplicatedStorage")
    local LocalPlayer = Players.LocalPlayer
    local Camera = workspace.CurrentCamera -- Kamera-Referenz hinzugefügt

    local box = Tabs.Blobman:AddLeftGroupbox("Blobman Controls")

    local Sets = {
        Name = nil,
        Char = nil,
        HRP = nil,
        TargetLeft = false
    }

    local function FWC(Parent, Name, Time) 
        return Parent:FindFirstChild(Name) or Parent:WaitForChild(Name, Time or 3) 
    end

    local function notifyTarget(text)
        if Library and Library.Notify then
            Library:Notify(text, 4)
        else
            print("[Blobman]: " .. tostring(text))
        end
    end

    BlobmanTarget = box:AddDropdown("Target", {
        Text = "Target",
        Values = {"None"},
        Default = 1,
        Multi = false,
        Callback = function(v)
            if getname then
                Sets.Name = getname(v)
            else
                Sets.Name = tostring(v)
            end
            Sets.TargetLeft = false
        end
    })

    cons["BlobmanTargetLeftNotify"] = Players.PlayerRemoving:Connect(function(player)
        if Sets.Name and player.Name == Sets.Name then
            Sets.TargetLeft = true
            notifyTarget(Sets.Name .. " left the game.")
        end
    end)

    cons["BlobmanTargetRejoinNotify"] = Players.PlayerAdded:Connect(function(player)
        if Sets.Name and Sets.TargetLeft and player.Name == Sets.Name then
            Sets.TargetLeft = false
            notifyTarget(Sets.Name .. " has rejoined.")
        end
    end)

    local BlobToggles = {
        ["Blob Lock"] = false,
        ["Kill"] = false,
        ["Kick"] = false
    }

    local BlobLockData = {
        Time = 0,
        StartPos = nil,
        LastTP = 0,
        HandToggle = false
    }

    -- Variablen für die "Kick Hard"-Logik
    local kickDragging = false
    local kickGrabStartTime = 0
    local kickLastRemote = 0
    local kickSavedPos = nil
    local REMOTE_DELAY = 0.002

    local function HandleBlobMethod(Method)
        -- Charakter-Updates deines eigenen Spielers zur Laufzeit abfragen
        local myChar = LocalPlayer.Character
        local myHum = myChar and myChar:FindFirstChildOfClass("Humanoid")
        local myHRP = myChar and myChar:FindFirstChild("HumanoidRootPart")
        local Blob = myHum and myHum.SeatPart and myHum.SeatPart.Parent

        if not myChar or not myHRP or not myHum then return end

        -- Target validieren
        local tt = Sets.Name and Players:FindFirstChild(Sets.Name)
        if not tt or not tt.Character or not tt.Character:FindFirstChild("HumanoidRootPart") then
            return
        end

        Sets.Char = tt.Character
        Sets.HRP = tt.Character.HumanoidRootPart

        if not Blob or Blob.Name ~= "CreatureBlobman" then
            return
        end

        local tHum = Sets.Char:FindFirstChildOfClass("Humanoid")
        if not tHum or tHum.Health == 0 then return end

        local LD = Blob:FindFirstChild("LeftDetector")
        local RD = Blob:FindFirstChild("RightDetector")
        local LW = LD and LD:FindFirstChild("LeftWeld")
        local RW = RD and RD:FindFirstChild("RightWeld")
        local grabScript = Blob:FindFirstChild("BlobmanSeatAndOwnerScript")
        
        local blobRoot = Blob:FindFirstChild("HumanoidRootPart") or Blob.PrimaryPart
        local GE = ReplicatedStorage:FindFirstChild("GrabEvents")

        -- ==================== BLOB LOCK METHODE ====================
        if Method == "Blob Lock" then
            local dist = (myHRP.Position - Sets.HRP.Position).Magnitude
            
            -- 1. Schneller Initial-Teleport & Grab
            if dist > 15 and tick() - BlobLockData.LastTP > 0.4 then
                BlobLockData.StartPos = myHRP.CFrame
                
                -- KAMERA FIX START: Position einfrieren vor dem TP zum Ziel
                local oldCamCFrame = Camera.CFrame
                Camera.CameraType = Enum.CameraType.Scriptable
                Camera.CFrame = oldCamCFrame

                myHRP.CFrame = Sets.HRP.CFrame + Vector3.new(0, 4, 0)
                
                -- Aggressiver Netzwerk-Claim
                if _G.SetNetworkOwner then
                    _G.SetNetworkOwner:FireServer(Sets.HRP, Sets.HRP.CFrame)
                elseif GE and GE:FindFirstChild("SetNetworkOwner") then
                    GE.SetNetworkOwner:FireServer(Sets.HRP, Sets.HRP.CFrame)
                end
                
                if LD and LW and grabScript and grabScript:FindFirstChild("CreatureGrab") then
                    grabScript.CreatureGrab:FireServer(LD, Sets.HRP, LW)
                end
                
                task.wait(0.02)
                myHRP.CFrame = BlobLockData.StartPos
                
                -- KAMERA FIX ENDE: Zurücksetzen, wenn du wieder an der StartPos bist
                Camera.CameraType = Enum.CameraType.Custom

                BlobLockData.LastTP = tick()
            end

            -- Freeze & Position Sync per Frame
            if isnetworkowner and isnetworkowner(Sets.HRP) then
                local currentDetector = BlobLockData.HandToggle and RD or LD
                if currentDetector then 
                    Sets.HRP.CFrame = currentDetector.CFrame 
                end
                for _, v in pairs(Sets.Char:GetChildren()) do
                    if v:IsA("BasePart") then v.Velocity = Vector3.zero end
                end
            end

            -- 2. ULTRA RAPID HAND SWAP
            if LD and RD and LW and RW and grabScript and grabScript:FindFirstChild("CreatureGrab") then
                for i = 1, 3 do 
                    BlobLockData.HandToggle = not BlobLockData.HandToggle
                    if BlobLockData.HandToggle then
                        grabScript.CreatureRelease:FireServer(LW, Sets.HRP)
                        grabScript.CreatureGrab:FireServer(RD, Sets.HRP, RW)
                    else
                        grabScript.CreatureRelease:FireServer(RW, Sets.HRP)
                        grabScript.CreatureGrab:FireServer(LD, Sets.HRP, LW)
                    end
                end
            end

        elseif Method == "Kill" then
    if LD and LW and grabScript and grabScript:FindFirstChild("CreatureGrab") then
        if LW.Attachment0 ~= Sets.HRP.RootAttachment and BlobToggles["Kill"] then
            
            -- ==================== ROBUSTES KILL-SYSTEM ====================
            
            -- 1. ZUSTAND SICHERN (vor jeglicher Manipulation)
            local SavedCFrame = myHRP.CFrame
            local SavedCamCFrame = Camera.CFrame
            
            -- 2. BLOB KOMPLETT EINFRIEREN (Physics + Input)
            local oldWalkSpeed = myHum.WalkSpeed
            local oldJumpPower = myHum.JumpPower
            myHum.WalkSpeed = 0
            myHum.JumpPower = 0
            
            -- 3. KAMERA FIX: Scriptable setzen UND CFrame sofort fixieren
            Camera.CameraType = Enum.CameraType.Scriptable
            Camera.CFrame = SavedCamCFrame
            
            -- 4. PHYSICS-PAUSE: Blob kurzzeitig "einfrieren"
            if myHRP.AssemblyLinearVelocity then
                myHRP.AssemblyLinearVelocity = Vector3.zero
                myHRP.AssemblyAngularVelocity = Vector3.zero
            end
            
            -- 5. WARTE AUF AUSSTEIGEN (mit Timeout-Schutz)
            local exitStart = tick()
            while tHum.SeatPart and (tick() - exitStart) < 3 do
                if GE and GE:FindFirstChild("SetNetworkOwner") then 
                    GE.SetNetworkOwner:FireServer(Sets.HRP, Sets.HRP.CFrame) 
                end
                task.wait(0.03)
            end
            
            -- 6. SICHERHEITSCHECK: Bist du noch im Blob?
            if not myHum.SeatPart or myHum.SeatPart.Parent ~= Blob then
                BlobToggles["Kill"] = false
                -- RESTORE alles sofort
                Camera.CameraType = Enum.CameraType.Custom
                myHum.WalkSpeed = oldWalkSpeed
                myHum.JumpPower = oldJumpPower
                return
            end
            
            -- 7. KILL-LOOP mit Anchor-Schutz
            local killSuccess = false
            for i = 1, 5 do
                -- Prüfe ob du noch im Blob bist
                if not myHum.SeatPart or myHum.SeatPart.Parent ~= Blob then 
                    break 
                end
                
                -- Wichtig: Setze Velocity VOR dem CFrame-Set zurück
                if myHRP.AssemblyLinearVelocity then
                    myHRP.AssemblyLinearVelocity = Vector3.zero
                end
                
                -- Sanfter Teleport (nicht instant, sondern mit kleiner Pause)
                myHRP.CFrame = Sets.HRP.CFrame - Vector3.new(0, 3, 0)
                task.wait(0.01) -- Kleiner Stabilisierungs-Frame
                
                grabScript.CreatureGrab:FireServer(LD, Sets.HRP, LW)
                task.wait(0.03)
                grabScript.CreatureRelease:FireServer(LW, Sets.HRP)
                tHum.Health = 0
                task.wait(0.05) -- Länger warten für Server-Sync
                
                killSuccess = true
            end
            
            -- 8. ZURÜCK-TELEPORT mit Stabilisierung
            if myHRP and BlobToggles["Kill"] and killSuccess then
                
                -- Velocity explizit nullen
                if myHRP.AssemblyLinearVelocity then
                    myHRP.AssemblyLinearVelocity = Vector3.zero
                    myHRP.AssemblyAngularVelocity = Vector3.zero
                end
                
                -- Sanft zurück (nicht instant)
                local targetCFrame = SavedCFrame + Vector3.new(0, 1.5, 0)
                
                -- Optional: Sanfte Interpolation statt instant
                myHRP.CFrame = targetCFrame
                task.wait(0.1) -- Wichtig! Server muss neue Position akzeptieren
                
                -- Doppelcheck: Position wirklich gesetzt?
                if (myHRP.Position - targetCFrame.Position).Magnitude > 5 then
                    myHRP.CFrame = targetCFrame -- Retry
                    task.wait(0.05)
                end
            end
            
            -- 9. KAMERA & STEUERUNG WIEDERHERSTELLEN
            -- Reihenfolge ist kritisch: Erst Blob steuerbar machen, dann Kamera
            myHum.WalkSpeed = oldWalkSpeed
            myHum.JumpPower = oldJumpPower
            
            -- Kurze Pause bevor Kamera freigegeben wird
            task.wait(0.1)
            
            -- Kamera sanft zurücksetzen
            Camera.CFrame = SavedCamCFrame
            Camera.CameraType = Enum.CameraType.Custom
            
            -- 10. FINALER PHYSICS-RESET
            task.wait(0.05)
            if myHRP.AssemblyLinearVelocity then
                myHRP.AssemblyLinearVelocity = Vector3.zero
            end
            
        end
        end

        -- ==================== KICK HARD METHODE ====================
        elseif Method == "Kick Hard" then
            if not blobRoot or not GE then return end

            if not kickSavedPos then
                kickSavedPos = blobRoot.CFrame
            end

            Sets.HRP.Velocity = Vector3.zero

            if not kickDragging then
                blobRoot.CFrame = Sets.HRP.CFrame
                blobRoot.Velocity = Vector3.zero

                if tick() - kickLastRemote >= REMOTE_DELAY then
                    kickLastRemote = tick()

                    pcall(function()
                        tHum.PlatformStand = true
                        tHum.Sit = true
                        GE.SetNetworkOwner:FireServer(Sets.HRP, blobRoot.CFrame)
                        GE.DestroyGrabLine:FireServer(Sets.HRP)
                    end)
                end

                if kickGrabStartTime == 0 then
                    kickGrabStartTime = tick()
                end

                if tick() - kickGrabStartTime > 0.35 then
                    kickDragging = true
                    kickGrabStartTime = 0
                    blobRoot.CFrame = kickSavedPos
                    blobRoot.Velocity = Vector3.zero
                end
            else
                blobRoot.CFrame = kickSavedPos
                blobRoot.Velocity = Vector3.zero

                local lockPos = kickSavedPos * CFrame.new(0, 23, 0)
                Sets.HRP.CFrame = lockPos
                tHum.PlatformStand = true
                tHum.Sit = true

                if tick() - kickLastRemote >= REMOTE_DELAY then
                    kickLastRemote = tick()

                    pcall(function()
                        GE.SetNetworkOwner:FireServer(Sets.HRP, lockPos)
                        GE.DestroyGrabLine:FireServer(Sets.HRP)

                        local weld = RD and (RD:FindFirstChild("RightWeld") or RD:FindFirstChildWhichIsA("Weld"))
                        if weld and grabScript then
                            grabScript.CreatureDrop:FireServer(weld)
                            grabScript.CreatureGrab:FireServer(RD, Sets.HRP, weld)
                        end
                    end)
                end
            end
        end
    end

    -- Toggles generieren
    for methodName, _ in pairs(BlobToggles) do
        box:AddToggle("Blob_" .. methodName, {
            Text = methodName,
            Default = false,
            Callback = function(v)
                BlobToggles[methodName] = v

                -- Reset-Logik beim Ausschalten
                if not v then
                    Camera.CameraType = Enum.CameraType.Custom -- Failsafe beim Ausschalten
                    
                    if methodName == "Kick Hard" then
                        kickDragging = false
                        kickGrabStartTime = 0
                        local myChar = LocalPlayer.Character
                        local myHum = myChar and myChar:FindFirstChildOfClass("Humanoid")
                        local Blob = myHum and myHum.SeatPart and myHum.SeatPart.Parent
                        local blobRoot = Blob and (Blob:FindFirstChild("HumanoidRootPart") or Blob.PrimaryPart)
                        if blobRoot and kickSavedPos then
                            blobRoot.CFrame = kickSavedPos
                            blobRoot.Velocity = Vector3.zero
                        end
                        kickSavedPos = nil
                    end
                    return
                end

                if v then
                    task.spawn(function()
                        while BlobToggles[methodName] do
                            if methodName == "Blob Lock" or methodName == "Kick Hard" then
                                task.wait() 
                                HandleBlobMethod(methodName)
                            else
                                local delayTime = 0.1
                                if Options and Options.BlobDelay and Options.BlobDelay.Value then
                                    delayTime = Options.BlobDelay.Value
                                end
                                task.wait(delayTime)
                                HandleBlobMethod(methodName)
                            end
                        end
                    end)
                end
            end
        })
    end

do
    local box = Tabs.Blobman:AddRightGroupbox("Settings", "wrench")

    box:AddToggle("AntiVelocity", {
    Text = "Loop Reset Velocity",
    Default = false,

    Callback = function(on)
        local RunService = game:GetService("RunService")
        local plr = game.Players.LocalPlayer

        -- Funktion um zu prüfen, ob Spieler auf einem CreatureBlobman sitzt
        local function isOnBlob()
            local char = plr.Character
            if not char then return false end
            
            local humanoid = char:FindFirstChild("Humanoid")
            if not humanoid then return false end
            
            local seat = humanoid.SeatPart
            if not seat then return false end
            
            -- Prüfen ob das Teil zu einem CreatureBlobman gehört
            local blobParent = seat:FindFirstAncestorWhichIsA("Model")
            return blobParent and blobParent.Name == "CreatureBlobman"
        end

        if on then
            if _G.velLoopConn then _G.velLoopConn:Disconnect() end

            _G.velLoopConn = RunService.Heartbeat:Connect(function()
                local char = plr.Character
                local root = char and char:FindFirstChild("HumanoidRootPart")
                
                -- Nur ausführen wenn Spieler auf CreatureBlobman sitzt
                if root and isOnBlob() then
                    -- 🧊 REMOVE ALL MOVEMENT
                    root.AssemblyLinearVelocity = Vector3.zero
                    root.AssemblyAngularVelocity = Vector3.zero
                    
                    root.Velocity = Vector3.zero
                    root.RotVelocity = Vector3.zero
                    
                    -- 🔄 ROTATION BEIBEHALTEN (KEIN LOCK)
                    -- Nur Position fixieren, Rotation bleibt erhalten
                    local pos = root.Position
                    local rot = root.CFrame - root.Position
                    root.CFrame = rot + pos
                    
                    -- 🧱 EXTRA ANTI PHYSICS
                    root.CustomPhysicalProperties = PhysicalProperties.new(0, 0, 0, 0, 0)
                end
            end)

        else
            if _G.velLoopConn then
                _G.velLoopConn:Disconnect()
                _G.velLoopConn = nil
            end

            -- restore physics
            local char = plr.Character
            local root = char and char:FindFirstChild("HumanoidRootPart")
            if root then
                root.CustomPhysicalProperties = nil
            end
        end
    end
})

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local plr = Players.LocalPlayer
local autoSitEnabled = false
local running = false
local loopThread = nil

local TOY_NAME = "CreatureBlobman"
local FOLDER_NAME = plr.Name .. "SpawnedInToys"

local SPAWN_OFFSET = CFrame.new(3, 2, 0)
local SPAWN_WAIT = 0.45
local LOOP_DELAY = 0.75

box:AddToggle("AutoSitBlobZ", {
    Text = "Auto Sit Blob",
    Default = false,
    Callback = function(v)
        autoSitEnabled = v

        if v then
            task.defer(function()
                trySitBlob()
            end)
        end
    end
})

local function getCharacterParts()
    local char = plr.Character
    if not char then return end

    local hum = char:FindFirstChildOfClass("Humanoid")
    local hrp = char:FindFirstChild("HumanoidRootPart")

    if not hum or not hrp or hum.Health <= 0 then
        return
    end

    return char, hum, hrp
end

local function getToyFolder()
    return Workspace:FindFirstChild(FOLDER_NAME)
end

local function findBlob()
    local folder = getToyFolder()
    if not folder then return nil end

    return folder:FindFirstChild(TOY_NAME)
end

local function findSeat(blob)
    if not blob then return nil end

    return blob:FindFirstChildWhichIsA("VehicleSeat", true)
end

local function destroyBlob(blob)
    if blob then
        pcall(function()
            blob:Destroy()
        end)
    end
end

local function spawnBlob()
    local _, _, hrp = getCharacterParts()
    if not hrp then return nil end

    local ok = pcall(function()
        RS.MenuToys.SpawnToyRemoteFunction:InvokeServer(
            TOY_NAME,
            hrp.CFrame * SPAWN_OFFSET,
            Vector3.zero
        )
    end)

    if not ok then
        return nil
    end

    task.wait(SPAWN_WAIT)
    return findBlob()
end

local function getValidBlob()
    local blob = findBlob()

    if not blob then
        blob = spawnBlob()
    end

    if not blob then
        return nil
    end

    local seat = findSeat(blob)

    if not seat then
        destroyBlob(blob)
        blob = spawnBlob()
        seat = findSeat(blob)
    end

    if not blob or not seat then
        return nil
    end

    return blob, seat
end

function trySitBlob()
    if not autoSitEnabled or running then return end
    running = true

    local _, hum, hrp = getCharacterParts()

    if not hum or not hrp then
        running = false
        return
    end

    if hum.SeatPart then
        running = false
        return
    end

    local blob, seat = getValidBlob()

    if not blob or not seat then
        running = false
        return
    end

    pcall(function()
        hum.AutoRotate = false

        hrp.AssemblyLinearVelocity = Vector3.zero
        hrp.AssemblyAngularVelocity = Vector3.zero
        hrp.CFrame = seat.CFrame * CFrame.new(0, 1.1, 0)

        task.wait(0.08)

        seat:Sit(hum)

        task.wait(0.12)

        hum.AutoRotate = true
    end)

    running = false
end

plr.CharacterAdded:Connect(function()
    task.wait(0.7)

    if autoSitEnabled then
        trySitBlob()
    end
end)

task.spawn(function()
    while true do
        task.wait(LOOP_DELAY)

        if autoSitEnabled then
            local _, hum = getCharacterParts()

            if hum and not hum.SeatPart then
                trySitBlob()
            end
        end
    end
end)

box:AddSlider("BlobDelay", {
        Text = "Blob Delay",
        Default = 0.05,
        Min = 0,
        Max = 1,
        Rounding = 2,
    })
end


-- ==================== Target - No Blobman ====================
do
    local box = Tabs.NoBlobman:AddLeftGroupbox("Grab Controls")
    local Camera = workspace.CurrentCamera -- Kamera-Referenz hinzugefügt

    local Sets = {
        Name = nil,
        Char = nil,
        HRP = nil,
        TargetLeft = false
    }

    local function notifyTarget(text)
        Library:Notify(text, 4)
    end

    GrabTarget = box:AddDropdown("Target", {
        Text = "Target",
        Values = {"None"},
        Default = 1,
        Multi = false,
        Callback = function(v)
            Sets.Name = getname(v)
            Sets.TargetLeft = false
        end
    })

    cons["TargetLeftNotify"] = Players.PlayerRemoving:Connect(function(player)
        if Sets.Name and player.Name == Sets.Name then
            Sets.TargetLeft = true
            notifyTarget(Sets.Name .. " left the game.")
        end
    end)

    cons["TargetRejoinNotify"] = Players.PlayerAdded:Connect(function(player)
        if Sets.Name and Sets.TargetLeft and player.Name == Sets.Name then
            Sets.TargetLeft = false
            notifyTarget(Sets.Name .. " has rejoined.")
        end
    end)

    local MethodToggles = {
        ["Loop Grab(Kick)"] = false,
        ["Loop Grab"] = false,
        ["Kill"] = false
    }

    local kickbp, kickbg
    local SpamSpeed = "Normal" -- "Normal", "Fast", "Extreme"

    local function UpdateTarget()
        local tt = Sets.Name and Players:FindFirstChild(Sets.Name)

        if not tt or not tt.Character or not tt.Character:FindFirstChild("HumanoidRootPart") then
            return nil
        end

        Sets.Char = tt.Character
        Sets.HRP = tt.Character.HumanoidRootPart

        return tt
    end

    local function GetWaitTime()
        if SpamSpeed == "Slow but better" then
            return 2.5
        elseif SpamSpeed == "Fast but worse" then
            return 0.1
        else -- Normal
            return 0.5
        end
    end

    local function DoLoopGrabKick()
        local tt = UpdateTarget()
        if not tt or not Sets.HRP or not hum or not HRP then
            return
        end

        if not Sets.Char or Sets.Char.Parent ~= workspace then
            return
        end

        local pos = HRP.CFrame

        DestroyLine:FireServer(Sets.HRP)
        RunService.RenderStepped:Wait(GetWaitTime())

        SetNetOwner:FireServer(Sets.HRP, Sets.HRP.CFrame)

        if (Sets.HRP.Position - HRP.Position).Magnitude >= 29 and Sets.Char.Parent == workspace then
            -- KAMERA FIX START: Kamera einfrieren, bevor der TP startet
            local oldCamCFrame = Camera.CFrame
            Camera.CameraType = Enum.CameraType.Scriptable
            Camera.CFrame = oldCamCFrame

            task.wait(0.29)

            tp(HRP, Sets.HRP)

            task.wait(0.3)

            sno(Sets.HRP)

            task.wait()

            HRP.CFrame = pos

            -- KAMERA FIX ENDE: Kamera wird erst wieder freigegeben, wenn du zurück bist
            Camera.CameraType = Enum.CameraType.Custom

            task.wait(0.13)

            for _, v in pairs(Sets.Char:GetChildren()) do
                if v:IsA("Part") and v.Name ~= "Humanoid" then
                    v.CFrame = pos * offset
                end
            end
        end

        if Sets.HRP.Position.Y < HRP.Position.Y + 4 and Sets.Char.Parent == workspace then
            repeat
                task.wait()
                sno(Sets.HRP)
                if not Sets.Char or Sets.Char.Parent ~= workspace then break end
            until Sets.Char.Head:FindFirstChild("PartOwner")

            if not Sets.Char or Sets.Char.Parent ~= workspace then return end
            HRP.CFrame = pos
            Sets.HRP.CFrame = HRP.CFrame * offset
        end

        if Toggles.EnableRagdoll.Value and PalletForRagdoll and inv:FindFirstChild("PalletForRagdoll") then
            task.spawn(function()
                PalletForRagdoll.SoundPart.AssemblyLinearVelocity = Vector3.new(0, 1000, 0)
                PalletForRagdoll.SoundPart.CFrame = Sets.HRP.CFrame

                task.wait(1.2)

                PalletForRagdoll.SoundPart.CFrame = HRP.CFrame * CFrame.new(0, 1000, 0)
            end)
        end

        if not kickbp or kickbp.Parent ~= Sets.HRP then
            kickbp = Instance.new("BodyPosition")
            kickbp.Parent = Sets.HRP
            kickbp.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
            kickbp.D = 200
        end

        if not kickbg or kickbg.Parent ~= Sets.HRP then
            kickbg = Instance.new("BodyGyro")
            kickbg.Parent = Sets.HRP
            kickbg.MaxTorque = Vector3.new(math.huge, math.huge, math.huge)
            kickbg.D = 100
        end

        kickbp.Position = HRP.Position + Vector3.new(offset.X, offset.Y, offset.Z)

        for _, v in Sets.Char:GetChildren() do
            if HasProperty(v, "AssemblyLinearVelocity") then
                stvel(v)
                v.Velocity = Vector3.zero
            end
        end
    end

    local function DoLoopGrab()
        local tt = UpdateTarget()
        if not tt or not Sets.HRP or not hum or not HRP then
            return
        end

        if not Sets.Char or Sets.Char.Parent ~= workspace then
            return
        end

        local pos = HRP.CFrame

        if (Sets.HRP.Position - HRP.Position).Magnitude > 30 then
            stvel(HRP)

            -- KAMERA FIX START: Kamera fixieren vor dem Ausreißer-TP
            local oldCamCFrame = Camera.CFrame
            Camera.CameraType = Enum.CameraType.Scriptable
            Camera.CFrame = oldCamCFrame

            HRP.CFrame = Sets.HRP.CFrame * CFrame.new(0,0,5)

            task.wait()

            repeat
                task.wait()
                sno(Sets.HRP)
                if not Sets.Char or Sets.Char.Parent ~= workspace then break end
            until Sets.Char.Head:FindFirstChild("PartOwner")

            if not Sets.Char or Sets.Char.Parent ~= workspace then 
                Camera.CameraType = Enum.CameraType.Custom -- Failsafe, falls abgebrochen wird
                return 
            end
            
            HRP.CFrame = pos
            
            -- KAMERA FIX ENDE: Kamera wieder normal anheften, nachdem du zurückgeportet bist
            Camera.CameraType = Enum.CameraType.Custom

            Sets.HRP.CFrame = HRP.CFrame * CFrame.new(0,15,0)
        end

        if Toggles.EnableRagdoll.Value and PalletForRagdoll and inv:FindFirstChild("PalletForRagdoll") then
            task.spawn(function()
                PalletForRagdoll.SoundPart.AssemblyLinearVelocity = Vector3.new(0, 1000, 0)
                PalletForRagdoll.SoundPart.CFrame = Sets.HRP.CFrame

                task.wait(0.05)

                PalletForRagdoll.SoundPart.CFrame = HRP.CFrame * CFrame.new(0, 1000, 0)
            end)
        end

        if Sets.Char and Sets.Char.Parent == workspace and Sets.Char.Head:FindFirstChild("PartOwner") then
            Sets.HRP.CFrame = HRP.CFrame * offset
        end

        sno(Sets.HRP)
    end

    local function DoKill()
        local tt = UpdateTarget()
        if not tt or not Sets.HRP or not hum or not HRP then
            return
        end

        local tHum = Sets.Char:FindFirstChild("Humanoid")
        if tHum and tHum.Health > 0 then
            local currentPos = HRP.CFrame
            local attackStart = tick()

            -- KAMERA FIX START (Optional für den Kill-TP, falls gewünscht)
            local oldCamCFrame = Camera.CFrame
            Camera.CameraType = Enum.CameraType.Scriptable
            Camera.CFrame = oldCamCFrame

            while tick() - attackStart < 0.2 do
                if not MethodToggles["Kill"] or not Sets.HRP.Parent then break end
                
                HRP.CFrame = Sets.HRP.CFrame * CFrame.new(0, -12, 0)
                HRP.Velocity = Vector3.zero
                
                pcall(function()
                    if SetNetOwner then
                        SetNetOwner:FireServer(Sets.HRP, HRP.CFrame)
                    elseif SetNetworkOwner then
                        SetNetworkOwner:FireServer(Sets.HRP, HRP.CFrame)
                    end

                    tHum:ChangeState(Enum.HumanoidStateType.Dead)
                    tHum.Health = 0

                    if CreateLine then
                        CreateLine:FireServer(Sets.HRP, Vector3.zero, Sets.HRP.Position, false)
                    end
                    if DestroyLine then
                        DestroyLine:FireServer(Sets.HRP)
                    end
                end)
                
                RunService.Heartbeat:Wait()
            end
            
            if HRP then
                HRP.CFrame = currentPos
                HRP.Velocity = Vector3.zero
            end
            
            -- KAMERA FIX ENDE
            Camera.CameraType = Enum.CameraType.Custom
            
            task.wait(1.2)
        else
            task.wait(0.5)
        end
    end

    for methodName, _ in pairs(MethodToggles) do
        box:AddToggle("NoBlob_" .. methodName, {
            Text = methodName,
            Default = false,

            Callback = function(v)
                MethodToggles[methodName] = v

                if not v then
                    if Sets.HRP and Sets.HRP:FindFirstChild("BodyPosition") then
                        Sets.HRP.BodyPosition:Destroy()
                    end
                    if HRP then 
                        HRP.Velocity = Vector3.zero 
                    end
                    -- Sicherstellen, dass die Kamera beim Ausschalten wieder normal ist
                    Camera.CameraType = Enum.CameraType.Custom
                    return
                end

                task.spawn(function()
                    while MethodToggles[methodName] do
                        local currentTarget = UpdateTarget()
                        if not currentTarget or not Sets.Char or Sets.Char.Parent ~= workspace then
                            task.wait(0.5)
                            continue
                        end

                        RunService.RenderStepped:Wait()

                        if methodName == "Loop Grab(Kick)" then
                            DoLoopGrabKick()

                        elseif methodName == "Loop Grab" then
                            DoLoopGrab()

                        elseif methodName == "Kill" then
                            DoKill()
                        end
                    end
                end)
            end
        })
    end

    -- ==================== GRAB SETTINGS ====================

    box:AddDivider()

    box:AddLabel("Grab Settings")
    box:AddLabel("Change Offset (Only for loop grabs)")

    local x, y, z = 0, 15, 0
    offset = CFrame.new(x, y, z)

    -- NUR SPAM SPEED DROPDOWN - NICHTS ANDERES
    box:AddDropdown("SpamSpeed", {
        Text = "Spam Speed (Loop Grab Kick)",
        Values = {"Normal", "Slow but better", "Fast but worse"},
        Default = 1,
        Multi = false,
        Callback = function(v)
            SpamSpeed = v
        end
    })

    box:AddSlider("OffsetX", {
        Text = "X",
        Default = 0,
        Min = -20,
        Max = 20,
        Rounding = 1,

        Callback = function(v)
            x = v
            offset = CFrame.new(x, y, z)
        end
    })

    box:AddSlider("OffsetY", {
        Text = "Y",
        Default = 15,
        Min = -20,
        Max = 20,
        Rounding = 1,

        Callback = function(v)
            y = v
            offset = CFrame.new(x, y, z)
        end
    })

    box:AddSlider("OffsetZ", {
        Text = "Z",
        Default = 0,
        Min = -20,
        Max = 20,
        Rounding = 1,

        Callback = function(v)
            z = v
            offset = CFrame.new(x, y, z)
        end
    })
end
end
-- ==================== Target - Settings ====================
do
    local box = Tabs.NoBlobman:AddRightGroupbox("Settings", "wrench")

   local RAGDOLL_PALLET_NAME = "PalletForRagdoll"
local MAX_WAIT = 8
local ragdollEnabled = false

local function disconnectPalletDestroying()
    if cons["PalletDestroying"] then
        cons["PalletDestroying"]:Disconnect()
        cons["PalletDestroying"] = nil
    end
end

local function waitUntil(predicate, timeout)
    local started = os.clock()

    repeat
        if predicate() then
            return true
        end
        task.wait()
    until timeout and os.clock() - started > timeout

    return false
end

local function spawnragdoll()
    if not ragdollEnabled or not HRP or not HRP.Parent then
        return
    end

    local pallet = spawntoy("PalletLightBrown", HRP.CFrame * CFrame.new(0, 10, 20))
    PalletForRagdoll = pallet

    if not pallet then
        return
    end

    if not waitUntil(function()
        return not pallet.Parent or pallet:FindFirstChild("SoundPart")
    end, MAX_WAIT) then
        return
    end

    if not pallet.Parent or not pallet:FindFirstChild("SoundPart") then
        return
    end

    local soundPart = pallet.SoundPart

    if not waitUntil(function()
        if not pallet.Parent or not soundPart.Parent then
            return true
        end

        sno(soundPart)
        return soundPart:FindFirstChild("PartOwner")
    end, MAX_WAIT) then
        return
    end

    if not pallet.Parent or not soundPart.Parent or not soundPart:FindFirstChild("PartOwner") then
        return
    end

    soundPart.AssemblyLinearVelocity = Vector3.new(0, 1e9, 0)

    for _, part in ipairs(pallet:GetChildren()) do
        if part:IsA("Part") then
            part.CanCollide = false
            part.CanQuery = false
            part.Transparency = 1
        end
    end

    pallet.Name = RAGDOLL_PALLET_NAME

    disconnectPalletDestroying()

    cons["PalletDestroying"] = pallet.Destroying:Once(function()
        if ragdollEnabled then
            task.defer(spawnragdoll)
        end
    end)
end

box:AddToggle("EnableRagdoll", {
    Text = "Enable Ragdoll Target",
    Default = false,
    Callback = function(v)
        ragdollEnabled = v

        if v then
            spawnragdoll()
            return
        end

        disconnectPalletDestroying()

        local existingPallet = inv:FindFirstChild(RAGDOLL_PALLET_NAME)
        if existingPallet then
            DestroyToy:FireServer(existingPallet)
        end
    end
}) 

    box:AddToggle("EnableGrabAntiKick", {
        Text = "Enable Anti Anti Kick",
        Default = false,
        Callback = function(v)
            if v then
                task.spawn(function()
                    while Toggles.EnableGrabAntiKick.Value and RunService.RenderStepped:Wait() do
                        if not GrabTarget.Value then return end
                        local tt = Players:FindFirstChild(getname(GrabTarget.Value))
                        if not tt then return end
                        for i, v in pairs(workspace[tt.Name .. "SpawnedInToys"]:GetChildren()) do
                            if v:FindFirstChild("StickyPart") and (v.StickyPart.Position - HRP.Position).Magnitude < 30 then
                                sno(v.StickyPart)
                                if v.StickyPart:FindFirstChild("PartOwner") and v.StickyPart.PartOwner.Value == plr.Name then
                                    v.StickyPart.CFrame = CFrame.new(0, 0 / 0, 0)
                                end
                            end
                        end
                    end
                end)
            end
        end
    })
end

-- ==================== Lags Tab ====================
do
    local box = Tabs.Lags:AddLeftGroupbox("Lag Methods")
    local lps = 100
    local Packets = 3000
    
    box:AddSlider("LPS", {
        Text = "Lines Per Second",
        Default = 100,
        Min = 1,
        Max = 1000,
        Rounding = 0,
        Callback = function(v)
            lps = v
        end
    })

    box:AddToggle("LineLag", {
        Text = "Line Lag",
        Default = false,
        Callback = function(v)
            linelag = v
            if v then
                task.spawn(function()
                    while linelag do
                        for i = 1, lps do
                            CreateLine:FireServer(workspace.SpawnLocation, CFrame.new(0, 9e9, 0))
                        end
                        task.wait(1)
                    end
                end)
            end
        end
    })

    box:AddSlider("Packets", {
        Text = "Packet Strength",
        Default = 3000,
        Min = 100,
        Max = 600000,
        Rounding = 0,
        Callback = function(v)
            Packets = v
        end
    })


    box:AddToggle("PacketLag", {
        Text = "Packets",
        Default = false,
        Callback = function(v)
            PacketsEnabled = v
            if v then
                task.spawn(function()
                    while PacketsEnabled and task.wait(0.5) do
                        if AntiDetect then
                            game:GetService("ReplicatedStorage").GrabEvents.CreateGrabLine:FireServer(string.rep("sosoososososossosoososososos", Packets))
                        else
                            game:GetService("ReplicatedStorage").GrabEvents.ExtendGrabLine:FireServer(string.rep("sosoososososossosoososososos", Packets))
                        end
                    end
                end)
            end
        end
    })

local activepackets = false
rs.GrabEvents.ExtendGrabLine.OnClientEvent:Connect(function(player, args)
    if typeof(args) == "string" and string.len(args) > 300 and not activepackets then
        activepackets = true
        local function GetSizeMB(StringLength)
            return StringLength / (1024 * 1024)
        end
        local SizeRounded = math.round(GetSizeMB(string.len(args)) * 1000) / 1000
        Library:Notify({
            Title = "Pexus",
            Description = player.Name.." Enabled Packets Size:"..SizeRounded,
            Time = 4,
        })
        task.wait(4)
        activepackets = false
    end
end) 
end

-- ==================== Keybinds Tab - Kategorisiert ====================
do
    local box = Tabs.Keybinds:AddLeftGroupbox("General Keybinds")
    local combatBox = Tabs.Keybinds:AddLeftGroupbox("Combat Keybinds")
    local defenceBox = Tabs.Keybinds:AddRightGroupbox("Defence Keybinds")
    local blobmanBox = Tabs.Keybinds:AddRightGroupbox("Blobman Keybinds")
    local playerBox = Tabs.Keybinds:AddRightGroupbox("Player Keybinds")
    local lagsBox = Tabs.Keybinds:AddRightGroupbox("Lags Keybinds")

        --// =========================
    --// GENERAL KEYBINDS (Links)
    --// =========================

    box:AddLabel("Menu Toggle"):AddKeyPicker("MenuKeybind", {
        Default = "M",
        NoUI = false,
        Text = "Menu keybind"
    })

    box:AddLabel("Teleport to Mouse"):AddKeyPicker("TPKeybind", {
        Default = "T",
        Text = "TP Keybind",
        Mode = "Press",
        Callback = function()
            if Mouse.Target then
                HRP.CFrame = Mouse.Hit * CFrame.new(0, 5, 0)
                stvel(HRP)
                Library:Notify("Teleported to mouse position", 2)
            else
                Library:Notify("No target found", 2)
            end
        end,
    })

    -- Leave Game Keybind
    box:AddLabel("Leave Game"):AddKeyPicker("LeaveGameBind", {
        Default = "L",
        NoUI = false,
        Text = "Leave Game",
        Mode = "Press",
        Callback = function()
            game:Shutdown()
        end,
    })

    -- Jerk Off Toggle
    box:AddToggle("JerkOff", {
        Text = "Jerk Off",
        Default = false,
        Callback = function(v)
            if v then
                local anim = Instance.new("Animation")
                local JerkFlag = nil
                local timepos = nil

                local screenGui = Instance.new("ScreenGui", plr:WaitForChild("PlayerGui"))
                local jerk = Instance.new("TextLabel", screenGui)
                screenGui.ResetOnSpawn = false

                jerk.Size = UDim2.new(0.1, 0, 0.015, 0)
                jerk.Position = UDim2.new(0.458, 0, 0.477, 0)
                jerk.Text = 'Jerk'
                jerk.TextStrokeColor3 = Color3.new(0, 0, 0)
                jerk.BackgroundTransparency = 1
                jerk.TextScaled = true
                jerk.TextColor3 = Color3.new(255, 255, 255)
                jerk.TextStrokeTransparency = 0
                jerk.Visible = false

                local R6 = "rbxassetid://168268306"
                local R15 = "rbxassetid://698251653"

                cons["JerkTool"] = UserInputService.InputBegan:Connect(function(input, g)
                    if g then return end
                    if input.KeyCode == Enum.KeyCode[Options.JerkBind.Value] then
                        JerkFlag = not (JerkFlag)
                        jerk.Visible = JerkFlag
                        if not (JerkFlag) then
                            jerkoff:Stop()
                            return
                        end
                        animator = plr.Character:WaitForChild('Humanoid'):WaitForChild("Animator")
                        if plr.Character.Humanoid.RigType == Enum.HumanoidRigType.R6 then
                            anim.AnimationId = R6
                        else
                            anim.AnimationId = R15
                        end
                        if anim.AnimationId == R6 then
                            timepos = 0.3
                        else
                            timepos = 0.55
                        end
                        jerkoff = animator:LoadAnimation(anim)
                        jerkoff:Play()
                        while task.wait(jerkspeed) and JerkFlag do
                            jerkoff.TimePosition = timepos
                        end
                    end
                end)
            else
                if cons["JerkTool"] then cons["JerkTool"]:Disconnect() end
                if jerkoff then jerkoff:Stop() end
                pcall(function()
                    plr.PlayerGui:FindFirstChild("ScreenGui"):Destroy()
                end)
            end
        end
    })

    box:AddLabel("Jerk Bind"):AddKeyPicker("JerkBind", {
        Default = "None",
        NoUI = false,
        Text = "Jerk Bind"
    })

    --// =========================
    --// COMBAT KEYBINDS (Links)
    --// =========================

    combatBox:AddLabel("Add To Blobman Target"):AddKeyPicker("AddToBlobmanTarget", {
        Default = "None",
        NoUI = false,
        Text = "Add To Blobman Target",
        Callback = function()
            local tar = Mouse.Target
            if tar and tar.Parent and game.Players:FindFirstChild(tar.Parent.Name) then
                local pl = game.Players[tar.Parent.Name]
                BlobmanTarget:SetValue(pl.DisplayName.." ("..pl.Name..")")
                Library:Notify("New Blobman Target! "..pl.DisplayName.." ("..pl.Name..")", 4)
            end
        end
    })

    combatBox:AddLabel("Add To No Blobman Target"):AddKeyPicker("AddToNoBlobmanTarget", {
        Default = "None",
        NoUI = false,
        Text = "Add To No Blobman Target",
        Callback = function()
            local tar = Mouse.Target
            if tar and tar.Parent and game.Players:FindFirstChild(tar.Parent.Name) then
                local pl = game.Players[tar.Parent.Name]
                GrabTarget:SetValue(pl.DisplayName.." ("..pl.Name..")")
                Library:Notify("New No Blobman Target! "..pl.DisplayName.." ("..pl.Name..")", 4)
            end
        end
    })

    --// =========================
    --// DEFENCE KEYBINDS (Rechts)
    --// =========================

    -- Gucci Method Toggle Keybind
    defenceBox:AddLabel("Toggle Gucci Method"):AddKeyPicker("GucciMethodKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Gucci Method Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.GucciMethod then
                local newValue = not Toggles.GucciMethod.Value
                Toggles.GucciMethod:SetValue(newValue)
                Library:Notify("Gucci Method " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Anti Grab Toggle Keybind
    defenceBox:AddLabel("Toggle Anti Grab"):AddKeyPicker("AntiGrabKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Anti Grab Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.AntiGrab then
                local newValue = not Toggles.AntiGrab.Value
                Toggles.AntiGrab:SetValue(newValue)
                Library:Notify("Anti Grab " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Anti Blobman Toggle Keybind
    defenceBox:AddLabel("Toggle Anti Blobman"):AddKeyPicker("AntiBlobmanKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Anti Blobman Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.AntiBlobman then
                local newValue = not Toggles.AntiBlobman.Value
                Toggles.AntiBlobman:SetValue(newValue)
                Library:Notify("Anti Blobman " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Anti Net Owner Toggle Keybind
    defenceBox:AddLabel("Toggle Anti Net Owner"):AddKeyPicker("AntiNetOwnerKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Anti Net Owner Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.SpawnToy then
                local newValue = not Toggles.SpawnToy.Value
                Toggles.SpawnToy:SetValue(newValue)
                Library:Notify("Anti Net Owner " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Anti Kick Toggle Keybind
    defenceBox:AddLabel("Toggle Anti Kick"):AddKeyPicker("AntiKickKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Anti Kick Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.ShurikenAntiKick then
                local newValue = not Toggles.ShurikenAntiKick.Value
                Toggles.ShurikenAntiKick:SetValue(newValue)
                Library:Notify("Anti Kick " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Anti Sticky Toggle Keybind
    defenceBox:AddLabel("Toggle Anti Sticky"):AddKeyPicker("AntiStickyKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Anti Sticky Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.AntiSticky then
                local newValue = not Toggles.AntiSticky.Value
                Toggles.AntiSticky:SetValue(newValue)
                Library:Notify("Anti Sticky " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    --// =========================
    --// BLOBMAN KEYBINDS (Rechts)
    --// =========================

    -- Auto Sit Blob Toggle Keybind
    blobmanBox:AddLabel("Toggle Auto Sit Blob"):AddKeyPicker("AutoSitBlobKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Auto Sit Blob Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.AutoSitBlobZ then
                local newValue = not Toggles.AutoSitBlobZ.Value
                Toggles.AutoSitBlobZ:SetValue(newValue)
                Library:Notify("Auto Sit Blob " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Blob Lock Toggle Keybind
    blobmanBox:AddLabel("Toggle Blob Lock"):AddKeyPicker("BlobLockKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Blob Lock Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles["Blob_Blob Lock"] then
                local newValue = not Toggles["Blob_Blob Lock"].Value
                Toggles["Blob_Blob Lock"]:SetValue(newValue)
                Library:Notify("Blob Lock " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    --// =========================
    --// PLAYER KEYBINDS (Rechts)
    --// =========================

    -- Flight Toggle Keybind
    playerBox:AddLabel("Toggle Flight"):AddKeyPicker("FlightKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Flight Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.FlightToggle then
                local newValue = not Toggles.FlightToggle.Value
                Toggles.FlightToggle:SetValue(newValue)
                Library:Notify("Flight " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Noclip Toggle Keybind
    playerBox:AddLabel("Toggle Noclip"):AddKeyPicker("NoclipKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Noclip Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.NoclipToggle then
                local newValue = not Toggles.NoclipToggle.Value
                Toggles.NoclipToggle:SetValue(newValue)
                Library:Notify("Noclip " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Walkspeed Toggle Keybind
    playerBox:AddLabel("Toggle Walkspeed"):AddKeyPicker("WalkspeedKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Walkspeed Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.WalkspeedToggle then
                local newValue = not Toggles.WalkspeedToggle.Value
                Toggles.WalkspeedToggle:SetValue(newValue)
                Library:Notify("Walkspeed " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Inf Jump Toggle Keybind
    playerBox:AddLabel("Toggle Inf Jump"):AddKeyPicker("InfJumpKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Inf Jump Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.InfJumpToggle then
                local newValue = not Toggles.InfJumpToggle.Value
                Toggles.InfJumpToggle:SetValue(newValue)
                Library:Notify("Inf Jump " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    --// =========================
    --// LAGS KEYBINDS (Rechts)
    --// =========================

    -- Line Lag Toggle Keybind
    lagsBox:AddLabel("Toggle Line Lag"):AddKeyPicker("LineLagKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Line Lag Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.LineLag then
                local newValue = not Toggles.LineLag.Value
                Toggles.LineLag:SetValue(newValue)
                Library:Notify("Line Lag " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })

    -- Packet Lag Toggle Keybind
    lagsBox:AddLabel("Toggle Packet Lag"):AddKeyPicker("PacketLagKeybind", {
        Default = "None",
        NoUI = false,
        Text = "Packet Lag Toggle",
        Mode = "Toggle",
        Callback = function()
            if Toggles.PacketLag then
                local newValue = not Toggles.PacketLag.Value
                Toggles.PacketLag:SetValue(newValue)
                Library:Notify("Packet Lag " .. (newValue and "Enabled" or "Disabled"), 3)
            end
        end
    })
end

-- ==================== WHITELIST TAB ====================
do
    local Players = game:GetService("Players")
    local plr = Players.LocalPlayer
    
    -- Speichert alle gewhitelisteten Spieler (UserIds)
    _G.WhitelistedPlayers = _G.WhitelistedPlayers or {}
    
    -- Aktuelle Spielerliste für Dropdown
    local playerUserIdMap = {} -- Map: DisplayName -> UserId
    
    local function getPlayerList()
        local list = {}
        playerUserIdMap = {}
        
        for _, player in ipairs(Players:GetPlayers()) do
            if player ~= plr then
                local displayText = player.Name
                table.insert(list, displayText)
                playerUserIdMap[displayText] = player.UserId
            end
        end
        
        if #list == 0 then
            table.insert(list, "None")
        end
        
        return list
    end
    
    local function isPlayerWhitelisted(userId)
        for _, id in ipairs(_G.WhitelistedPlayers) do
            if id == userId then
                return true
            end
        end
        return false
    end
    
    local function addToWhitelist(userId)
        if not isPlayerWhitelisted(userId) then
            table.insert(_G.WhitelistedPlayers, userId)
        end
    end
    
    local function removeFromWhitelist(userId)
        for i, id in ipairs(_G.WhitelistedPlayers) do
            if id == userId then
                table.remove(_G.WhitelistedPlayers, i)
                return true
            end
        end
        return false
    end
    
    -- Linke Seite - Hauptcontrols (wie im Screenshot)
    local leftBox = Tabs.Whitelist:AddLeftGroupbox("Whitelist")
    
    -- Spieler Dropdown (wie im Screenshot: "Whitelist Players")
    local selectedPlayerName = nil
    
    leftBox:AddLabel("Whitelist Players", true)
    
    local playerDropdown = leftBox:AddDropdown("WhitelistPlayerSelect", {
        Text = "", -- Kein extra Text, nur Label oben
        Default = "None",
        Values = getPlayerList(),
        Multi = false,
        Callback = function(v)
            selectedPlayerName = v ~= "None" and v or nil
        end
    })
    
    -- Add to Whitelist Button (wie im Screenshot)
    leftBox:AddButton("Add to Whitelist", function()
        if not selectedPlayerName or selectedPlayerName == "None" then
            Library:Notify("Please select a player first!", 3)
            return
        end
        
        local userId = playerUserIdMap[selectedPlayerName]
        if not userId then
            Library:Notify("Player not found!", 3)
            return
        end
        
        if isPlayerWhitelisted(userId) then
            Library:Notify(selectedPlayerName .. " is already whitelisted!", 3)
            return
        end
        
        addToWhitelist(userId)
        Library:Notify("Added " .. selectedPlayerName .. " to whitelist!", 3)
    end)
    
    leftBox:AddDivider()
    
    -- Settings Button/Link (wie im Screenshot)
    leftBox:AddButton("Settings", function()
        -- Öffnet die Settings oder zeigt Whitelist-Settings
        Library:Notify("Whitelist Settings: " .. #_G.WhitelistedPlayers .. " player(s) whitelisted", 3)
    end)
    
    leftBox:AddDivider()
    
    -- Auto Whitelist Friends Toggle (wie im Screenshot)
    leftBox:AddToggle("AutoWhitelistFriends", {
        Text = "Auto Whitelist Friends",
        Default = false,
        Callback = function(v)
            if v then
                local friendCount = 0
                for _, player in ipairs(Players:GetPlayers()) do
                    if player ~= plr then
                        local success, isFriend = pcall(function()
                            return player:IsFriendsWith(plr.UserId)
                        end)
                        if success and isFriend then
                            addToWhitelist(player.UserId)
                            friendCount = friendCount + 1
                        end
                    end
                end
                
                if friendCount > 0 then
                    Library:Notify("Auto-whitelisted " .. friendCount .. " friend(s)!", 3)
                end
            end
        end
    })
    
    -- Toggle Whitelist (wie im Screenshot)
    leftBox:AddToggle("ToggleWhitelist", {
        Text = "Toggle Whitelist",
        Default = false,
        Callback = function(v)
            WhitelistEnabled = v
            if v then
                Library:Notify("Whitelist Enabled!", 3)
            else
                Library:Notify("Whitelist Disabled!", 3)
            end
        end
    })
    
    -- Auto-Update Spielerliste
    Players.PlayerAdded:Connect(function(newPlayer)
        task.wait(0.5)
        playerDropdown:SetValues(getPlayerList())
        
        -- Auto-Freunde checken
        if Toggles.AutoWhitelistFriends and Toggles.AutoWhitelistFriends.Value then
            local success, isFriend = pcall(function()
                return newPlayer:IsFriendsWith(plr.UserId)
            end)
            if success and isFriend then
                addToWhitelist(newPlayer.UserId)
                Library:Notify("Auto-whitelisted friend: " .. newPlayer.Name, 3)
            end
        end
    end)
    
    Players.PlayerRemoving:Connect(function(leftPlayer)
        task.wait(0.1)
        playerDropdown:SetValues(getPlayerList())
    end)
    
    -- ==================== WHITELIST CHECK FUNKTION ====================
    
    _G.IsPlayerWhitelisted = function(player)
        if not WhitelistEnabled then return false end
        return isPlayerWhitelisted(player.UserId)
    end
end
    

do
local box = Tabs["Server"]:AddLeftGroupbox("Main")

box:AddButton("Destroy Server(Need Blobman)", function()
    local blob = hum.SeatPart and hum.SeatPart.Parent and hum.SeatPart.Parent.Name == "CreatureBlobman" and hum.SeatPart.Parent
    if not blob then return end
    blob.Name = "blob"
    local CD,CR,CG = blob.BlobmanSeatAndOwnerScript.CreatureDrop, blob.BlobmanSeatAndOwnerScript.CreatureRelease, blob.BlobmanSeatAndOwnerScript.CreatureGrab
    local pos = blob.HumanoidRootPart.CFrame * CFrame.new(0, 30, 0)
    for i,v in game.Players:GetPlayers() do
        pcall(function()
            if v ~= plr and v.Character and v.Character:FindFirstChild("HumanoidRootPart") and (not WhitelistEnabled or not v:IsFriendsWith(plr.UserId)) then
                blob.HumanoidRootPart.CFrame = v.Character.HumanoidRootPart.CFrame
                task.wait(0.2)
                CG:FireServer(nil, v.Character.HumanoidRootPart, blob.RightDetector.RightWeld)
                CR:FireServer(blob.RightDetector.RightWeld)
            end
        end)
        task.wait(0.1)
    end
    blob.HumanoidRootPart.CFrame = pos
    task.wait(0.1)
    blob.HumanoidRootPart.Anchored = true
    local rotation = 0
    for i,v in game.Players:GetPlayers() do
        pcall(function()
            if v ~= plr and v.Character and v.Character:FindFirstChild("HumanoidRootPart") and isnetworkowner(v.Character.HumanoidRootPart) and (not WhitelistEnabled or not v:IsFriendsWith(plr.UserId)) then
                local bg = Instance.new("BodyGyro", v.Character.HumanoidRootPart)
                bg.CFrame = CFrame.new(0, 0, 0)
                stvel(blob.HumanoidRootPart)
                stvel(v.Character.HumanoidRootPart)
                rotation = rotation + 30
                v.Character.HumanoidRootPart.CFrame = CFrame.new(HRP.Position) * CFrame.Angles(0, math.rad(rotation), 0) * CFrame.new(i, 0, 0)
                stvel(blob.HumanoidRootPart)
                task.wait(0.2)
                sno(v.Character.HumanoidRootPart)
                DestroyLine:FireServer(v.Character.HumanoidRootPart)
                task.wait()
                CG:FireServer(nil, v.Character.HumanoidRootPart, blob.RightDetector.RightWeld)
            end
        end)
        task.wait(0.1)
    end
    task.wait(0.1)
    blob.HumanoidRootPart.Anchored = false
    DestroyToy:FireServer(inv.blob)
end)
end

-- ==================== TOY TAB ====================
do
    local ToyTab = Tabs.Toy
    
    --// AURA GRAB TOGGLE
    local auraRunning = false
    
    -- (Hinweis: startScanner, stopScanner, cleanupOwnedParts, TrackedParts 
    --  müssen in deinem Hauptscript definiert sein)
    
    ToyTab:AddLeftGroupbox("Aura Grab"):AddToggle("AuraToggle", {
        Text = "Aura (Disable when using something!)",
        Default = false,
        Callback = function(enabled)
            if enabled then
                auraRunning = true
                if startScanner then startScanner() end
                Library:Notify("Aura Grab Started", 3)
            else
                if stopScanner then stopScanner() end
                if cleanupOwnedParts then cleanupOwnedParts() end
                Library:Notify("Aura Grab Stopped", 3)
            end
        end
    })
    
    --// HOLLOW PURPLE SETTINGS
    HollowPurpleSettings = {
        OrbDistance = 80,
        OrbOffset = 80,
        Height = 5,
        PosX = 0,
        PosY = 0,
        PosZ = 0
    }
    
    local hollowBox = ToyTab:AddLeftGroupbox("Hollow Purple Settings")
    
    hollowBox:AddSlider("HollowPurpleDistance", {
        Text = "Orb Distance",
        Default = 80,
        Min = 10,
        Max = 200,
        Rounding = 0,
        Callback = function(Value)
            HollowPurpleSettings.OrbDistance = Value
        end,
    })
    
    hollowBox:AddSlider("HollowPurpleOffset", {
        Text = "Orb Offset",
        Default = 80,
        Min = 10,
        Max = 200,
        Rounding = 0,
        Callback = function(Value)
            HollowPurpleSettings.OrbOffset = Value
        end,
    })
    
    hollowBox:AddSlider("HollowPurpleHeight", {
        Text = "Height",
        Default = 5,
        Min = 0,
        Max = 50,
        Rounding = 0,
        Callback = function(Value)
            HollowPurpleSettings.Height = Value
        end,
    })
    
    hollowBox:AddSlider("HollowPurplePosX", {
        Text = "Position X",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            HollowPurpleSettings.PosX = Value
        end,
    })
    
    hollowBox:AddSlider("HollowPurplePosY", {
        Text = "Position Y",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            HollowPurpleSettings.PosY = Value
        end,
    })
    
    hollowBox:AddSlider("HollowPurplePosZ", {
        Text = "Position Z",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            HollowPurpleSettings.PosZ = Value
        end,
    })
    
    hollowBox:AddButton("Hollow Purple...", function()
        local char = plr.Character
        if not char or not char:FindFirstChild("HumanoidRootPart") then return end
        local root = char.HumanoidRootPart
        local forward = root.CFrame.LookVector
        local right = root.CFrame.RightVector
        local basePos = Vector3.new(HollowPurpleSettings.PosX, HollowPurpleSettings.PosY, HollowPurpleSettings.PosZ)
        local leftOrbPos = basePos + root.Position + forward * HollowPurpleSettings.OrbDistance - right * HollowPurpleSettings.OrbOffset + Vector3.new(0, HollowPurpleSettings.Height, 0)
        local rightOrbPos = basePos + root.Position + forward * HollowPurpleSettings.OrbDistance + right * HollowPurpleSettings.OrbOffset + Vector3.new(0, HollowPurpleSettings.Height, 0)
        local centerOrbPos = basePos + root.Position + forward * HollowPurpleSettings.OrbDistance + Vector3.new(0, HollowPurpleSettings.Height, 0)
        
        local GatheredParts = {}
        local partsList = {}
        for part, _ in pairs(TrackedParts or {}) do
            if part and part:IsDescendantOf(workspace) then 
                if StopFloat then StopFloat(part) end
                table.insert(partsList, part) 
            end
        end
        
        for i, part in ipairs(partsList) do
            local orbTarget = (i % 2 == 0) and rightOrbPos or leftOrbPos
            local bp = Instance.new("BodyPosition")
            bp.MaxForce = Vector3.new(1e6, 1e6, 1e6)
            bp.D = 1000
            bp.P = 20000
            bp.Position = orbTarget + Vector3.new(math.random(-3, 3), math.random(-2, 2), math.random(-3, 3))
            bp.Parent = part
            GatheredParts[part] = bp
        end
        
        task.delay(3, function()
            for part, bp in pairs(GatheredParts) do
                bp.Position = centerOrbPos + Vector3.new(math.random(-2, 2), math.random(-2, 2), math.random(-2, 2))
            end
            task.delay(2, function()
                for part, bp in pairs(GatheredParts) do
                    if bp and bp.Parent then bp:Destroy() end
                    local blast = Instance.new("BodyVelocity")
                    blast.MaxForce = Vector3.new(1e6, 1e6, 1e6)
                    blast.Velocity = Vector3.new(math.random(-500, 500), math.random(-300, 300), math.random(-500, 500))
                    blast.Parent = part
                    Debris:AddItem(blast, 1)
                end
                table.clear(GatheredParts)
                if TrackedParts then table.clear(TrackedParts) end
            end)
        end)
    end)
    
    --// SWASTIKA SETTINGS
    SwastikaSettings = {
        Height = 250,
        Scale = 15,
        PosX = 0,
        PosY = 250,
        PosZ = 0
    }
    
    local swastikaBox = ToyTab:AddRightGroupbox("Swastika Settings")
    
    swastikaBox:AddSlider("SwastikaScale", {
        Text = "Scale",
        Default = 15,
        Min = 5,
        Max = 50,
        Rounding = 0,
        Callback = function(Value)
            SwastikaSettings.Scale = Value
        end,
    })
    
    swastikaBox:AddSlider("SwastikaPosX", {
        Text = "Position X",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            SwastikaSettings.PosX = Value
        end,
    })
    
    swastikaBox:AddSlider("SwastikaPosY", {
        Text = "Position Y",
        Default = 250,
        Min = 0,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            SwastikaSettings.PosY = Value
        end,
    })
    
    swastikaBox:AddSlider("SwastikaPosZ", {
        Text = "Position Z",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            SwastikaSettings.PosZ = Value
        end,
    })
    
    swastikaBox:AddButton("Swastika", function()
        local basePos = Vector3.new(SwastikaSettings.PosX, SwastikaSettings.PosY, SwastikaSettings.PosZ)
        local scale = SwastikaSettings.Scale
        local CUSTOM_9x9 = {
            "100011111",
            "100010000",
            "100010000",
            "100010000",
            "111111111",
            "000010001",
            "000010001",
            "000010001",
            "111110001",
        }
        local partsList = {}
        for part, _ in pairs(TrackedParts or {}) do
            if part and part:IsDescendantOf(workspace) then 
                if StopFloat then StopFloat(part) end
                table.insert(partsList, part) 
            end
        end
        local targetPositions = {}
        local height = #CUSTOM_9x9
        local width = #CUSTOM_9x9[1]
        for row = 1, height do
            local line = CUSTOM_9x9[row]
            for col = 1, width do
                if line:sub(col, col) == "1" then
                    local offset = Vector3.new((col - 1 - width / 2) * scale, 0, -(row - 1 - height / 2) * scale)
                    table.insert(targetPositions, basePos + offset)
                end
            end
        end
        if #partsList < #targetPositions then
            Library:Notify("Not Enough Pallets - You need at least " .. tostring(#targetPositions) .. " pallets!", 4)
            return
        end
        for i, part in ipairs(partsList) do
            local target = targetPositions[(i - 1) % #targetPositions + 1]
            local bp = Instance.new("BodyPosition")
            bp.MaxForce = Vector3.new(1e9, 1e9, 1e9)
            bp.D = 1000
            bp.P = 50000
            bp.Position = target
            bp.Parent = part
        end
    end)
    
    --// TELEPORT SETTINGS
    TeleportSettings = {
        PosX = 0,
        PosY = 0,
        PosZ = 0
    }
    
    local tpBox = ToyTab:AddRightGroupbox("Teleport Settings")
    
    tpBox:AddSlider("TeleportPosX", {
        Text = "Position X",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TeleportSettings.PosX = Value
        end,
    })
    
    tpBox:AddSlider("TeleportPosY", {
        Text = "Position Y",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TeleportSettings.PosY = Value
        end,
    })
    
    tpBox:AddSlider("TeleportPosZ", {
        Text = "Position Z",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TeleportSettings.PosZ = Value
        end,
    })
    
    tpBox:AddButton("Teleport Parts To Point", function()
        local targetPosition = Vector3.new(TeleportSettings.PosX, TeleportSettings.PosY, TeleportSettings.PosZ)
        local partsList = {}
        for part, _ in pairs(TrackedParts or {}) do
            if part and part:IsDescendantOf(workspace) then 
                if StopFloat then StopFloat(part) end
                table.insert(partsList, part) 
            end
        end
        if #partsList == 0 then return end
        for _, part in ipairs(partsList) do
            pcall(function() part.CFrame = CFrame.new(targetPosition) end)
        end
    end)
    
    --// ORBIT SETTINGS
    OrbitSettings = {
        Radius = 50,
        Speed = 100,
        Height = 3
    }
    
    local orbitBox = ToyTab:AddLeftGroupbox("Orbit Settings")
    
    orbitBox:AddSlider("OrbitRadius", {
        Text = "Radius",
        Default = 50,
        Min = 10,
        Max = 200,
        Rounding = 0,
        Callback = function(Value)
            OrbitSettings.Radius = Value
        end,
    })
    
    orbitBox:AddSlider("OrbitSpeed", {
        Text = "Speed",
        Default = 100,
        Min = 10,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            OrbitSettings.Speed = Value
        end,
    })
    
    orbitBox:AddSlider("OrbitHeight", {
        Text = "Height Variation",
        Default = 3,
        Min = 0,
        Max = 20,
        Rounding = 0,
        Callback = function(Value)
            OrbitSettings.Height = Value
        end,
    })
    
    local ORBIT_RADIUS = 50
    local ORBIT_SPEED = math.rad(100)
    local orbitingParts = {}
    local orbitConnection = nil
    local orbitEnabled = false
    
    function startOrbit()
        local char = plr.Character
        if not char or not char:FindFirstChild("HumanoidRootPart") then return end
        local root = char.HumanoidRootPart
        if orbitConnection then orbitConnection:Disconnect() end
        orbitingParts = {}
        for part, _ in pairs(TrackedParts or {}) do
            if part and part:IsDescendantOf(workspace) then 
                orbitingParts[part] = {angle = math.random() * 2 * math.pi} 
            end
        end
        orbitConnection = RunService.Heartbeat:Connect(function(dt)
            local time = tick()
            local index = 0
            for part, data in pairs(orbitingParts) do
                if part and part.Parent then
                    data.angle = data.angle + math.rad(OrbitSettings.Speed) * dt
                    local x = math.cos(data.angle) * OrbitSettings.Radius
                    local z = math.sin(data.angle) * OrbitSettings.Radius
                    local y = math.sin(time + index) * OrbitSettings.Height
                    local targetPos = root.Position + Vector3.new(x, y, z)
                    if part:FindFirstChild("BodyPosition") then
                        part.BodyPosition.Position = targetPos
                    else
                        local bp = Instance.new("BodyPosition")
                        bp.MaxForce = Vector3.new(1e6, 1e6, 1e6)
                        bp.P = 5000
                        bp.D = 100
                        bp.Position = targetPos
                        bp.Parent = part
                    end
                    index = index + 1
                end
            end
        end)
    end
    
    function stopOrbit()
        if orbitConnection then orbitConnection:Disconnect() orbitConnection = nil end
        for part in pairs(orbitingParts) do
            if part and part:FindFirstChild("BodyPosition") then part.BodyPosition:Destroy() end
        end
        orbitingParts = {}
    end
    
    orbitBox:AddToggle("OrbitMeToggle", {
        Text = "Orbit",
        Default = false,
        Callback = function(enabled)
            orbitEnabled = enabled
            if enabled then startOrbit() else stopOrbit() end
        end
    })
    
    --// TORNADO SETTINGS
    TornadoSettings = {
        Height = 200,
        Radius = 100,
        Speed = 200,
        PosX = 0,
        PosY = 0,
        PosZ = 0
    }
    
    local tornadoBox = ToyTab:AddRightGroupbox("Tornado Settings")
    
    tornadoBox:AddSlider("TornadoHeight", {
        Text = "Height",
        Default = 200,
        Min = 50,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TornadoSettings.Height = Value
        end,
    })
    
    tornadoBox:AddSlider("TornadoRadius", {
        Text = "Radius",
        Default = 100,
        Min = 20,
        Max = 300,
        Rounding = 0,
        Callback = function(Value)
            TornadoSettings.Radius = Value
        end,
    })
    
    tornadoBox:AddSlider("TornadoSpeed", {
        Text = "Speed",
        Default = 200,
        Min = 50,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TornadoSettings.Speed = Value
        end,
    })
    
    tornadoBox:AddSlider("TornadoPosX", {
        Text = "Position X",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TornadoSettings.PosX = Value
        end,
    })
    
    tornadoBox:AddSlider("TornadoPosY", {
        Text = "Position Y",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TornadoSettings.PosY = Value
        end,
    })
    
    tornadoBox:AddSlider("TornadoPosZ", {
        Text = "Position Z",
        Default = 0,
        Min = -500,
        Max = 500,
        Rounding = 0,
        Callback = function(Value)
            TornadoSettings.PosZ = Value
        end,
    })
    
    local TORNADO_HEIGHT = 200
    local TORNADO_BASE_RADIUS = 100
    local TORNADO_SPIN_SPEED = math.rad(200)
    local tornadoParts = {}
    local tornadoConnection = nil
    
    function startTornado()
        local center = Vector3.new(TornadoSettings.PosX, TornadoSettings.PosY, TornadoSettings.PosZ)
        if tornadoConnection then tornadoConnection:Disconnect() end
        tornadoParts = {}
        for part, _ in pairs(TrackedParts or {}) do
            if part and part:IsDescendantOf(workspace) then 
                tornadoParts[part] = {angle = math.random() * 2 * math.pi, heightOffset = math.random() * TornadoSettings.Height} 
            end
        end
        tornadoConnection = RunService.Heartbeat:Connect(function(dt)
            for part, data in pairs(tornadoParts) do
                if part and part.Parent then
                    data.angle = data.angle + math.rad(TornadoSettings.Speed) * dt
                    local t = data.heightOffset % TornadoSettings.Height
                    local radius = (t / TornadoSettings.Height) * TornadoSettings.Radius
                    local x = math.cos(data.angle) * radius
                    local z = math.sin(data.angle) * radius
                    local y = t
                    local targetPos = center + Vector3.new(x, y, z)
                    if part:FindFirstChild("BodyPosition") then
                        part.BodyPosition.Position = targetPos
                    else
                        local bp = Instance.new("BodyPosition")
                        bp.MaxForce = Vector3.new(1e6, 1e6, 1e6)
                        bp.P = 5000
                        bp.D = 100
                        bp.Position = targetPos
                        bp.Parent = part
                    end
                    data.heightOffset = data.heightOffset + 50 * dt
                end
            end
        end)
    end
    
    function stopTornado()
        if tornadoConnection then tornadoConnection:Disconnect() tornadoConnection = nil end
        for part in pairs(tornadoParts) do
            if part and part:FindFirstChild("BodyPosition") then part.BodyPosition:Destroy() end
        end
        tornadoParts = {}
    end
    
    tornadoBox:AddToggle("TornadoToggle", {
        Text = "Tornado",
        Default = false,
        Callback = function(enabled)
            if enabled then startTornado() else stopTornado() end
        end
    })
end



-- ==================== UI Settings ====================
local MenuGroup = Tabs["UI Settings"]:AddLeftGroupbox("Menu Settings")

MenuGroup:AddButton("Unload", function()
    for i, v in Toggles do
        if not v.Value then continue end
        v:SetValue(false)
    end
    if game.CoreGui:FindFirstChild("SnowGui") then
        game.CoreGui.SnowGui:Destroy()
    end
    workspace.Camera.Blur.Size = 0
    Library:Unload()
end)

MenuGroup:AddToggle("AlwaysViewCursor", {
    Text = "Always View Cursor",
    Default = false,
    Callback = function(v)
        alwaysshowcursor = v
        if v then
            task.spawn(function()
                while alwaysshowcursor and task.wait() do
                    UserInputService.MouseIconEnabled = true
                end
            end)
        else
            UserInputService.MouseIconEnabled = false
        end
    end
})

--// ============================================
--// RECHTE SEITE - UI CUSTOMIZATION
--// ============================================
local uiCustomizeGroup = Tabs["UI Settings"]:AddRightGroupbox("UI Customization")


-- Watermark Toggle (KORRIGIERT)
local watermarkVisible = true
uiCustomizeGroup:AddToggle("Watermark", {
    Text = "Show Watermark",
    Default = true,
    Callback = function(v)
        watermarkVisible = v
        -- Obsidian nutzt Watermark-Label direkt
        local obsidianGui = gethui():FindFirstChild("Obsidian")
        if obsidianGui then
            local watermark = obsidianGui:FindFirstChild("Watermark", true)
            if watermark then
                watermark.Visible = v
            end
        end
        -- Fallback über Library
        if Library.SetWatermarkVisibility then
            Library:SetWatermarkVisibility(v)
        end
    end
})

-- UI Blur Toggle (KORRIGIERT)
uiCustomizeGroup:AddToggle("UIBlur", {
    Text = "UI Background Blur",
    Default = true,
    Callback = function(v)
        Blur = v
        if not v then
            pcall(function()
                workspace.Camera.Blur.Size = 0
            end)
        end
        Library:Notify("UI Blur " .. (v and "aktiviert" or "deaktiviert"), 2)
    end
})

-- UI Corner Radius Slider (KORRIGIERT)
uiCustomizeGroup:AddSlider("UICornerRadius", {
    Text = "Corner Radius",
    Default = 15,
    Min = 0,
    Max = 30,
    Rounding = 0,
    Callback = function(v)
        -- Aktualisiere alle Corners in der UI
        local obsidianGui = gethui():FindFirstChild("Obsidian")
        if obsidianGui then
            for _, obj in ipairs(obsidianGui:GetDescendants()) do
                if obj:IsA("UICorner") and obj.Parent and obj.Parent.Name ~= "AvatarImage" then
                    obj.CornerRadius = UDim.new(0, v)
                end
            end
        end
        Library:Notify("Corner Radius: " .. v .. "px", 1.5)
    end
})

-- UI Scale Slider (KORRIGIERT)
uiCustomizeGroup:AddSlider("UIScale", {
    Text = "UI Scale",
    Default = 100,
    Min = 50,
    Max = 150,
    Rounding = 0,
    Suffix = "%",
    Callback = function(v)
        local scale = v / 100
        local obsidianGui = gethui():FindFirstChild("Obsidian")
        if obsidianGui then
            local main = obsidianGui:FindFirstChild("Main")
            if main and main:IsA("Frame") then
                -- Skaliere über UIScale
                main.Size = UDim2.new(0, 550 * scale, 0, 400 * scale)
            end
        end
        Library:Notify("UI Scale: " .. v .. "%", 1.5)
    end
})

-- UI Transparency Slider (KORRIGIERT)
uiCustomizeGroup:AddSlider("UITransparency", {
    Text = "UI Transparency",
    Default = 0,
    Min = 0,
    Max = 90,
    Rounding = 0,
    Suffix = "%",
    Callback = function(v)
        local trans = v / 100
        local obsidianGui = gethui():FindFirstChild("Obsidian")
        if obsidianGui then
            for _, obj in ipairs(obsidianGui:GetDescendants()) do
                if obj:IsA("Frame") and obj.Name ~= "Main" and obj.Name ~= "GlassRainParticle" then
                    -- Nur Hintergrund-Frames, nicht der Main Container
                    if obj.BackgroundTransparency < 1 and obj.Name ~= "TopBar" and obj.Name ~= "Sidebar" then
                        obj.BackgroundTransparency = 0.3 + (trans * 0.7)
                    end
                end
            end
        end
        Library:Notify("UI Transparency: " .. v .. "%", 1.5)
    end
})

-- Sidebar Compact Toggle (KORRIGIERT)
uiCustomizeGroup:AddToggle("SidebarCompact", {
    Text = "Compact Sidebar",
    Default = true,
    Callback = function(v)
        -- Obsidian Sidebar Compact
        local obsidianGui = gethui():FindFirstChild("Obsidian")
        if obsidianGui then
            local sidebar = obsidianGui:FindFirstChild("Sidebar", true)
            if sidebar and sidebar:IsA("Frame") then
                if v then
                    sidebar.Size = UDim2.new(0, 45, 1, 0)
                else
                    sidebar.Size = UDim2.new(0, 140, 1, 0)
                end
            end
        end
        -- Fallback
        if Library.SetSidebarCompacted then
            Library:SetSidebarCompacted(v)
        end
        Library:Notify("Sidebar " .. (v and "kompakt" or "erweitert"), 2)
    end
})

-- Notification Position Dropdown (KORRIGIERT)
uiCustomizeGroup:AddDropdown("NotifyPosition", {
    Text = "Notification Position",
    Values = {"Right", "Left", "Top", "Bottom"},
    Default = 1,
    Multi = false,
    Callback = function(v)
        if Library.NotifySide then
            Library.NotifySide = v
        end
        if Library.SetNotifySide then
            Library:SetNotifySide(v)
        end
        Library:Notify("Notify Position: " .. v, 2)
    end
})

-- Notification Duration Slider (KORRIGIERT)
uiCustomizeGroup:AddSlider("NotifyDuration", {
    Text = "Notify Duration",
    Default = 5,
    Min = 1,
    Max = 15,
    Rounding = 0,
    Suffix = "s",
    Callback = function(v)
        if Library.Notify then
            -- Speichere Dauer für zukünftige Notifies
            getgenv().PexusNotifyDuration = v
        end
        Library:Notify("Notify Duration: " .. v .. "s", 2)
    end
})

--// ============================================
--// LINKE SEITE - UI TOGGLES (KORRIGIERT & VERBESSERT)
--// ============================================
local uiTogglesGroup = Tabs["UI Settings"]:AddLeftGroupbox("UI Toggles")

-- Show/Hide Keybinds (KORRIGIERT)
local keybindFrameVisible = false
uiTogglesGroup:AddToggle("ShowKeybinds", {
    Text = "Show Keybind List",
    Default = false,
    Callback = function(v)
        keybindFrameVisible = v
        local obsidianGui = gethui():FindFirstChild("Obsidian")
        if obsidianGui then
            -- Suche Keybind-Liste
            for _, obj in ipairs(obsidianGui:GetDescendants()) do
                if obj.Name:find("Keybind") and obj:IsA("Frame") and obj.Name ~= "KeybindsTab" then
                    obj.Visible = v
                end
            end
        end
        if Library.ShowKeybindFrame then
            Library:ShowKeybindFrame(v)
        end
        Library:Notify("Keybind List " .. (v and "angezeigt" or "versteckt"), 2)
    end
})

-- Show/Hide FPS Counter (KORRIGIERT)
local fpsCounterVisible = true
uiTogglesGroup:AddToggle("ShowFPS", {
    Text = "Show FPS Counter",
    Default = true,
    Callback = function(v)
        fpsCounterVisible = v
        -- Aktualisiere Watermark Text
        if Library.SetWatermark then
            -- FPS wird im Watermark angezeigt, speichere State
            getgenv().PexusShowFPS = v
        end
        Library:Notify("FPS Counter " .. (v and "aktiviert" or "deaktiviert"), 2)
    end
})

-- Show/Hide Ping Counter (KORRIGIERT)
local pingCounterVisible = true
uiTogglesGroup:AddToggle("ShowPing", {
    Text = "Show Ping Counter",
    Default = true,
    Callback = function(v)
        pingCounterVisible = v
        -- Ping wird im Watermark angezeigt
        getgenv().PexusShowPing = v
        Library:Notify("Ping Counter " .. (v and "aktiviert" or "deaktiviert"), 2)
    end
})

-- Auto-Minimize on Lost Focus (KORRIGIERT)
local autoMinimizeEnabled = false
uiTogglesGroup:AddToggle("AutoMinimize", {
    Text = "Auto-Minimize on Focus Loss",
    Default = false,
    Callback = function(v)
        autoMinimizeEnabled = v
        if v then
            -- Verbinde mit Window Focus Loss
            local userInput = game:GetService("UserInputService")
            getgenv().PexusAutoMinimizeConn = userInput.WindowFocusReleased:Connect(function()
                if autoMinimizeEnabled and Library and Library.Close then
                    Library:Close()
                end
            end)
            Library:Notify("Auto-Minimize aktiviert", 2)
        else
            -- Trenne Connection
            if getgenv().PexusAutoMinimizeConn then
                getgenv().PexusAutoMinimizeConn:Disconnect()
                getgenv().PexusAutoMinimizeConn = nil
            end
            Library:Notify("Auto-Minimize deaktiviert", 2)
        end
    end
})

-- Click-Through Mode (KORRIGIERT)
local clickThroughEnabled = false
uiTogglesGroup:AddToggle("ClickThrough", {
    Text = "Click-Through Mode",
    Default = false,
    Callback = function(v)
        clickThroughEnabled = v
        local obsidianGui = gethui():FindFirstChild("Obsidian")
        if obsidianGui then
            local main = obsidianGui:FindFirstChild("Main")
            if main then
                -- ClickThrough = UI ignoriert Maus-Klicks
                main.Active = not v
                for _, obj in ipairs(main:GetDescendants()) do
                    if obj:IsA("TextButton") or obj:IsA("ImageButton") then
                        obj.Active = not v
                    end
                end
            end
        end
        if Library.SetClickThrough then
            Library:SetClickThrough(v)
        end
        Library:Notify("Click-Through " .. (v and "aktiviert" or "deaktiviert"), 2)
    end
})


--// ============================================
--// THEME & SAVE MANAGER (unverändert)
--// ============================================

Library.ToggleKeybind = Options.MenuKeybind

-- Theme and Save managers
ThemeManager:SetLibrary(Library)
ThemeManager:SetFolder("MyScriptHub")
ThemeManager:ApplyToTab(Tabs["UI Settings"])
ThemeManager:LoadDefault()

SaveManager:SetLibrary(Library)
SaveManager:IgnoreThemeSettings()
SaveManager:SetIgnoreIndexes({ "MenuKeybind" })
SaveManager:SetFolder("MyScriptHub/specific-game")
SaveManager:BuildConfigSection(Tabs["UI Settings"])
SaveManager:LoadAutoloadConfig()

-- Update player lists for dropdowns
local function UpdatePlayerLists()
    local list = {}
    for _, pl in ipairs(Players:GetPlayers()) do
        table.insert(list, pl.DisplayName .. " (" .. pl.Name .. ")")
    end
    GrabTarget:SetValues(list)
    BlobmanTarget:SetValues(list)
end

Players.PlayerAdded:Connect(UpdatePlayerLists)
Players.PlayerRemoving:Connect(UpdatePlayerLists)
UpdatePlayerLists()

-- Track seats of players for Gucci removal
for i, v in Players:GetPlayers() do
    if v ~= plr then
        if v.Character and v.Character.Humanoid.SeatPart then
            Seats[v.Name] = v.Character.Humanoid.SeatPart
        end
        v.CharacterAdded:Connect(function(c)
            c:WaitForChild("Humanoid"):GetPropertyChangedSignal("SeatPart"):Connect(function()
                local seat = c.Humanoid.SeatPart
                if not seat then return end
                Seats[v.Name] = seat
            end)
        end)
        if v.Character then
            v.Character.Humanoid:GetPropertyChangedSignal("SeatPart"):Connect(function()
                local seat = v.Character.Humanoid.SeatPart
                if not seat then return end
                Seats[v.Name] = seat
            end)
        end
    end
end

Players.PlayerAdded:Connect(function(p)
    if p ~= plr then
        p.CharacterAdded:Connect(function(c)
            c:WaitForChild("Humanoid"):GetPropertyChangedSignal("SeatPart"):Connect(function()
                local seat = c.Humanoid.SeatPart
                if not seat then return end
                Seats[p.Name] = seat
            end)
        end)
        if p.Character then
            p.Character.Humanoid:GetPropertyChangedSignal("SeatPart"):Connect(function()
                local seat = p.Character.Humanoid.SeatPart
                if not seat then return end
                Seats[p.Name] = seat
            end)
        end
    end
end)

-- Keep HRP Massless false
task.spawn(function()
    while task.wait(0.1) do
        if HRP and HRP.Parent then
            HRP.Massless = false
        end
    end
end)

-- Keep other players' HRP Massless false
for i, v in Players:GetPlayers() do
    if v ~= plr then
        if v.Character and v.Character.Humanoid.SeatPart then
            Seats[v.Name] = v.Character.Humanoid.SeatPart
        end
        v.CharacterAdded:Connect(function(c)
            task.wait(1)
            c.HumanoidRootPart:GetPropertyChangedSignal("Massless"):Connect(function()
                if c.HumanoidRootPart.Massless == true then
                    c.HumanoidRootPart.Massless = false
                end
            end)
        end)
        if v.Character then
            v.Character.HumanoidRootPart:GetPropertyChangedSignal("Massless"):Connect(function()
                if v.Character.HumanoidRootPart.Massless == true then
                    v.Character.HumanoidRootPart.Massless = false
                end
            end)
        end
    end
end

Players.PlayerAdded:Connect(function(p)
    if p ~= plr then
        p.CharacterAdded:Connect(function(c)
            task.wait(1)
            c.HumanoidRootPart:GetPropertyChangedSignal("Massless"):Connect(function()
                if c.HumanoidRootPart.Massless == true then
                    c.HumanoidRootPart.Massless = false
                end
            end)
        end)
        if p.Character then
            p.Character.HumanoidRootPart:GetPropertyChangedSignal("Massless"):Connect(function()
                if p.Character.HumanoidRootPart.Massless == true then
                    p.Character.HumanoidRootPart.Massless = false
                end
            end)
        end
    end
end)

-- Blur effect
task.wait(3)
task.spawn(function()
    while task.wait(0.1) do
        workspace.Camera.Blur.Enabled = Blur and gethui().Obsidian.Main.Visible
        workspace.Camera.Blur.Size = 30
    end
end)

-- ==================== CHAT COMMANDS SYSTEM ====================
-- Alle Commands mit % Prefix

do
    local TextChatService = game:GetService("TextChatService")
    local Players = game:GetService("Players")
    local plr = Players.LocalPlayer
    local TweenService = game:GetService("TweenService")
    local RunService = game:GetService("RunService")
    local HttpService = game:GetService("HttpService")
    local Lighting = game:GetService("Lighting")
    local Workspace = game:GetService("Workspace")
    
    -- Command Registry
    local Commands = {}
    local activeLoops = {}
    local copiedUsers = {}
    local orbitData = {}
    local followData = {}
    local autoFarmData = {}
    local spamData = {}
    local trollData = {}
    
    -- Hilfsfunktionen
    local function cmdToggle(toggleName, state)
        local toggle = Toggles[toggleName]
        if toggle then
            if state ~= nil then
                toggle:SetValue(state)
                return toggle.Value
            else
                toggle:SetValue(not toggle.Value)
                return toggle.Value
            end
        end
        return nil
    end
    
    local function cmdSlider(sliderName, value)
        local slider = Options[sliderName]
        if slider then
            slider:SetValue(tonumber(value))
            return slider.Value
        end
        return nil
    end
    
    local function cmdDropdown(dropdownName, value)
        local dropdown = Options[dropdownName]
        if dropdown then
            dropdown:SetValue(value)
            return dropdown.Value
        end
        return nil
    end
    
    local function notify(msg)
        if Library and Library.Notify then
            Library:Notify(msg, 3)
        end
        pcall(function()
            game:GetService("StarterGui"):SetCore("ChatMakeSystemMessage", {
                Text = "[Pexus] " .. msg,
                Color = Color3.fromRGB(0, 255, 150),
                Font = Enum.Font.SourceSansBold,
                TextSize = 18
            })
        end)
    end
    
    local function getPlayerByName(name)
        name = name:lower()
        for _, player in ipairs(Players:GetPlayers()) do
            if player.Name:lower():find(name) or player.DisplayName:lower():find(name) then
                return player
            end
        end
        return nil
    end
    
    local function getCharacter()
        return plr.Character, plr.Character and plr.Character:FindFirstChild("HumanoidRootPart"), plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
    end
    
    -- ==================== COPY USER SYSTEM ====================
    
    Commands["copyuser"] = function(args)
        if not args[1] then return "Usage: %copyuser [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local state = true
        if args[2] and args[2] == "off" then state = false end
        
        if not state then
            if copiedUsers[target.UserId] then
                copiedUsers[target.UserId] = nil
                return "Stopped copying " .. target.Name
            end
            return "Not copying " .. target.Name
        end
        
        if copiedUsers[target.UserId] then
            return "Already copying " .. target.Name
        end
        
        copiedUsers[target.UserId] = {
            player = target,
            lastCFrame = nil,
            connection = nil
        }
        
        -- Start copying
        task.spawn(function()
            while copiedUsers[target.UserId] do
                local _, myHRP, myHum = getCharacter()
                if not myHRP or not myHum then task.wait(0.1) continue end
                
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
                
                if targetHRP and targetHum then
                    -- Copy position
                    local offset = CFrame.new(0, 0, 3) -- Behind them
                    local targetCF = targetHRP.CFrame * offset
                    
                    -- Smooth teleport
                    myHRP.CFrame = targetCF
                    
                    -- Copy animations/movement
                    if targetHum.MoveDirection.Magnitude > 0 then
                        myHum:Move(targetHum.MoveDirection, true)
                    end
                    
                    -- Copy jump
                    if targetHum:GetState() == Enum.HumanoidStateType.Jumping and myHum:GetState() ~= Enum.HumanoidStateType.Jumping then
                        myHum:ChangeState(Enum.HumanoidStateType.Jumping)
                    end
                    
                    -- Copy sitting
                    if targetHum.Sit ~= myHum.Sit then
                        myHum.Sit = targetHum.Sit
                    end
                end
                
                task.wait()
            end
        end)
        
        return "Now copying " .. target.Name .. " - You will follow their every move!"
    end
    
    Commands["copystop"] = function(args)
        if args[1] then
            local target = getPlayerByName(args[1])
            if target and copiedUsers[target.UserId] then
                copiedUsers[target.UserId] = nil
                return "Stopped copying " .. target.Name
            end
            return "Not copying " .. (target and target.Name or args[1])
        end
        
        -- Stop all
        local count = 0
        for uid, _ in pairs(copiedUsers) do
            copiedUsers[uid] = nil
            count = count + 1
        end
        return "Stopped copying " .. count .. " player(s)"
    end
    
    -- ==================== ORBIT SYSTEM ====================
    
    Commands["orbit"] = function(args)
        if not args[1] then return "Usage: %orbit [playername] [speed] [distance] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        if args[#args] == "off" then
            if orbitData[target.UserId] then
                orbitData[target.UserId].active = false
                orbitData[target.UserId] = nil
                return "Stopped orbiting " .. target.Name
            end
            return "Not orbiting " .. target.Name
        end
        
        local speed = tonumber(args[2]) or 50
        local distance = tonumber(args[3]) or 5
        local height = tonumber(args[4]) or 0
        
        if orbitData[target.UserId] then
            orbitData[target.UserId].active = false
            task.wait(0.1)
        end
        
        orbitData[target.UserId] = {
            active = true,
            speed = speed,
            distance = distance,
            height = height,
            angle = 0
        }
        
        task.spawn(function()
            while orbitData[target.UserId] and orbitData[target.UserId].active do
                local _, myHRP, _ = getCharacter()
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if myHRP and targetHRP then
                    local data = orbitData[target.UserId]
                    data.angle = data.angle + (data.speed * 0.01)
                    
                    local x = math.cos(data.angle) * data.distance
                    local z = math.sin(data.angle) * data.distance
                    
                    local newPos = targetHRP.Position + Vector3.new(x, data.height, z)
                    myHRP.CFrame = CFrame.new(newPos, targetHRP.Position)
                end
                
                task.wait()
            end
        end)
        
        return "Orbiting " .. target.Name .. " at speed " .. speed .. ", distance " .. distance
    end
    
    Commands["orbitstop"] = function(args)
        if args[1] then
            local target = getPlayerByName(args[1])
            if target and orbitData[target.UserId] then
                orbitData[target.UserId].active = false
                orbitData[target.UserId] = nil
                return "Stopped orbiting " .. target.Name
            end
        end
        
        local count = 0
        for uid, data in pairs(orbitData) do
            data.active = false
            count = count + 1
        end
        orbitData = {}
        return "Stopped " .. count .. " orbit(s)"
    end
    
    -- ==================== FOLLOW SYSTEM ====================
    
    Commands["follow"] = function(args)
        if not args[1] then return "Usage: %follow [playername] [distance] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        if args[#args] == "off" then
            if followData[target.UserId] then
                followData[target.UserId].active = false
                followData[target.UserId] = nil
                return "Stopped following " .. target.Name
            end
            return "Not following " .. target.Name
        end
        
        local distance = tonumber(args[2]) or 5
        
        if followData[target.UserId] then
            followData[target.UserId].active = false
            task.wait(0.1)
        end
        
        followData[target.UserId] = {
            active = true,
            distance = distance
        }
        
        task.spawn(function()
            while followData[target.UserId] and followData[target.UserId].active do
                local _, myHRP, _ = getCharacter()
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if myHRP and targetHRP then
                    local direction = (targetHRP.Position - myHRP.Position).Unit
                    local targetPos = targetHRP.Position - (direction * followData[target.UserId].distance)
                    
                    myHRP.CFrame = CFrame.new(targetPos, targetHRP.Position)
                end
                
                task.wait(0.05)
            end
        end)
        
        return "Following " .. target.Name .. " at distance " .. distance
    end
    
    Commands["unfollow"] = function(args)
        if args[1] then
            local target = getPlayerByName(args[1])
            if target and followData[target.UserId] then
                followData[target.UserId].active = false
                followData[target.UserId] = nil
                return "Stopped following " .. target.Name
            end
        end
        
        local count = 0
        for uid, data in pairs(followData) do
            data.active = false
            count = count + 1
        end
        followData = {}
        return "Stopped following " .. count .. " player(s)"
    end
    
    -- ==================== BRING / GRAB SYSTEM ====================
    
    Commands["bring"] = function(args)
        if not args[1] then return "Usage: %bring [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local _, myHRP, _ = getCharacter()
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not myHRP or not targetHRP then return "Character not found" end
        
        -- Network ownership claim
        pcall(function()
            SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
        end)
        
        targetHRP.CFrame = myHRP.CFrame * CFrame.new(0, 0, -3)
        stvel(targetHRP)
        
        return "Brought " .. target.Name .. " to you!"
    end
    
    Commands["grab"] = function(args)
        if not args[1] then return "Usage: %grab [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local loopName = "grab_" .. target.UserId
        
        if args[2] == "off" then
            activeLoops[loopName] = nil
            return "Released " .. target.Name
        end
        
        if activeLoops[loopName] then return "Already grabbing " .. target.Name end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                local _, myHRP, _ = getCharacter()
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if myHRP and targetHRP then
                    pcall(function()
                        SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
                    end)
                    targetHRP.CFrame = myHRP.CFrame * CFrame.new(0, 0, -2)
                    stvel(targetHRP)
                end
                
                task.wait()
            end
        end)
        
        return "Grabbing " .. target.Name .. " - Use %grab " .. target.Name .. " off to release"
    end
    
    Commands["throw"] = function(args)
        if not args[1] then return "Usage: %throw [playername] [power]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local power = tonumber(args[2]) or 500
        
        local _, myHRP, _ = getCharacter()
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not myHRP or not targetHRP then return "Character not found" end
        
        pcall(function()
            SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
        end)
        
        local direction = (targetHRP.Position - myHRP.Position).Unit
        targetHRP.Velocity = direction * power + Vector3.new(0, power * 0.5, 0)
        
        return "Threw " .. target.Name .. " with power " .. power .. "!"
    end
    
    Commands["fling"] = function(args)
        if not args[1] then return "Usage: %fling [playername] [power]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local power = tonumber(args[2]) or 1000
        
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not targetHRP then return "Character not found" end
        
        pcall(function()
            SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
        end)
        
        targetHRP.Velocity = Vector3.new(
            math.random(-power, power),
            power,
            math.random(-power, power)
        )
        targetHRP.AssemblyAngularVelocity = Vector3.new(
            math.random(-power, power),
            math.random(-power, power),
            math.random(-power, power)
        )
        
        return "Flung " .. target.Name .. "!"
    end
    
    -- ==================== TELEPORT COMMANDS ====================
    
    Commands["tpto"] = function(args)
        if not args[1] then return "Usage: %tpto [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local _, myHRP, _ = getCharacter()
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not myHRP or not targetHRP then return "Character not found" end
        
        myHRP.CFrame = targetHRP.CFrame * CFrame.new(0, 0, 2)
        stvel(myHRP)
        
        return "Teleported to " .. target.Name
    end
    
    Commands["tpbehind"] = function(args)
        if not args[1] then return "Usage: %tpbehind [playername] [distance]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local distance = tonumber(args[2]) or 5
        
        local _, myHRP, _ = getCharacter()
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not myHRP or not targetHRP then return "Character not found" end
        
        myHRP.CFrame = targetHRP.CFrame * CFrame.new(0, 0, distance)
        stvel(myHRP)
        
        return "Teleported behind " .. target.Name
    end
    
    Commands["tpabove"] = function(args)
        if not args[1] then return "Usage: %tpabove [playername] [height]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local height = tonumber(args[2]) or 10
        
        local _, myHRP, _ = getCharacter()
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not myHRP or not targetHRP then return "Character not found" end
        
        myHRP.CFrame = targetHRP.CFrame * CFrame.new(0, height, 0)
        stvel(myHRP)
        
        return "Teleported above " .. target.Name
    end
    
    Commands["tprandom"] = function(args)
        local _, myHRP, _ = getCharacter()
        if not myHRP then return "Character not found" end
        
        local range = tonumber(args[1]) or 500
        local x = math.random(-range, range)
        local z = math.random(-range, range)
        local y = math.random(50, 200)
        
        myHRP.CFrame = CFrame.new(x, y, z)
        stvel(myHRP)
        
        return "Teleported to random position: " .. math.floor(x) .. ", " .. math.floor(y) .. ", " .. math.floor(z)
    end
    
    Commands["tpwaypoint"] = function(args)
        if not args[1] then return "Usage: %tpwaypoint [name] or %tpwaypoint list" end
        
        if args[1] == "list" then
            local locations = {
                "yellowhouse", "bluehouse", "pinkhouse", "spookyhouse", 
                "greenhouse", "spawn", "void", "sky"
            }
            return "Waypoints: " .. table.concat(locations, ", ")
        end
        
        local waypoints = {
            ["yellowhouse"] = CFrame.new(584.452026, 141.213989, -99.8799973),
            ["bluehouse"] = CFrame.new(524.703979, 93.7120056, -375.040985),
            ["pinkhouse"] = CFrame.new(-524.942993, 21.6340027, -165.309998),
            ["spookyhouse"] = CFrame.new(302.973022, 13.8590088, 482.948975),
            ["greenhouse"] = CFrame.new(-571.75, 19.5239868, 89),
            ["spawn"] = CFrame.new(0, 100, 0),
            ["void"] = CFrame.new(0, -50000, 0),
            ["sky"] = CFrame.new(0, 50000, 0)
        }
        
        local wp = waypoints[args[1]:lower()]
        if not wp then return "Waypoint not found. Use %tpwaypoint list" end
        
        local _, myHRP, _ = getCharacter()
        if not myHRP then return "Character not found" end
        
        myHRP.CFrame = wp
        stvel(myHRP)
        
        return "Teleported to " .. args[1]
    end
    
    Commands["setwaypoint"] = function(args)
        if not args[1] then return "Usage: %setwaypoint [name]" end
        
        local _, myHRP, _ = getCharacter()
        if not myHRP then return "Character not found" end
        
        if not _G.CustomWaypoints then _G.CustomWaypoints = {} end
        _G.CustomWaypoints[args[1]:lower()] = myHRP.CFrame
        
        return "Waypoint '" .. args[1] .. "' set at current position!"
    end
    
    Commands["tpwaypointcustom"] = function(args)
        if not args[1] then return "Usage: %tpwaypointcustom [name]" end
        
        if not _G.CustomWaypoints or not _G.CustomWaypoints[args[1]:lower()] then
            return "Custom waypoint not found: " .. args[1]
        end
        
        local _, myHRP, _ = getCharacter()
        if not myHRP then return "Character not found" end
        
        myHRP.CFrame = _G.CustomWaypoints[args[1]:lower()]
        stvel(myHRP)
        
        return "Teleported to custom waypoint: " .. args[1]
    end
    
    -- ==================== LOOP TELEPORTS ====================
    
    Commands["looptp"] = function(args)
        if not args[1] then return "Usage: %looptp [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local loopName = "looptp_" .. target.UserId
        
        if args[2] == "off" then
            activeLoops[loopName] = nil
            return "Stopped loop teleporting to " .. target.Name
        end
        
        if activeLoops[loopName] then return "Already loop teleporting to " .. target.Name end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                local _, myHRP, _ = getCharacter()
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if myHRP and targetHRP then
                    myHRP.CFrame = targetHRP.CFrame * CFrame.new(0, 0, 2)
                    stvel(myHRP)
                end
                
                task.wait(0.05)
            end
        end)
        
        return "Loop teleporting to " .. target.Name .. " - Use %looptp " .. target.Name .. " off to stop"
    end
    
    Commands["loopbring"] = function(args)
        if not args[1] then return "Usage: %loopbring [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local loopName = "loopbring_" .. target.UserId
        
        if args[2] == "off" then
            activeLoops[loopName] = nil
            return "Stopped loop bringing " .. target.Name
        end
        
        if activeLoops[loopName] then return "Already loop bringing " .. target.Name end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                local _, myHRP, _ = getCharacter()
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if myHRP and targetHRP then
                    pcall(function()
                        SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
                    end)
                    targetHRP.CFrame = myHRP.CFrame * CFrame.new(0, 0, -3)
                    stvel(targetHRP)
                end
                
                task.wait()
            end
        end)
        
        return "Loop bringing " .. target.Name .. " - Use %loopbring " .. target.Name .. " off to stop"
    end
    
    -- ==================== KILL COMMANDS ====================
    
    Commands["kill"] = function(args)
        if not args[1] then return "Usage: %kill [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local targetChar = target.Character
        local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
        
        if not targetHum then return "Character not found" end
        
        pcall(function()
            targetHum:ChangeState(Enum.HumanoidStateType.Dead)
            targetHum.Health = 0
        end)
        
        return "Killed " .. target.Name
    end
    
    Commands["loopkill"] = function(args)
        if not args[1] then return "Usage: %loopkill [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local loopName = "loopkill_" .. target.UserId
        
        if args[2] == "off" then
            activeLoops[loopName] = nil
            return "Stopped loop killing " .. target.Name
        end
        
        if activeLoops[loopName] then return "Already loop killing " .. target.Name end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                local targetChar = target.Character
                local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
                
                if targetHum and targetHum.Health > 0 then
                    pcall(function()
                        targetHum:ChangeState(Enum.HumanoidStateType.Dead)
                        targetHum.Health = 0
                    end)
                end
                
                task.wait(0.1)
            end
        end)
        
        return "Loop killing " .. target.Name
    end
    
    Commands["killall"] = function(args)
        local count = 0
        for _, player in ipairs(Players:GetPlayers()) do
            if player ~= plr then
                pcall(function()
                    local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
                    if hum then
                        hum:ChangeState(Enum.HumanoidStateType.Dead)
                        hum.Health = 0
                        count = count + 1
                    end
                end)
            end
        end
        return "Killed " .. count .. " player(s)"
    end
    
    Commands["killaura"] = function(args)
        local state = cmdToggle("KillAura", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Kill Aura " .. (state and "Enabled" or "Disabled")
    end
    
    -- ==================== ADMIN COMMANDS ====================
    
    Commands["freeze"] = function(args)
        if not args[1] then return "Usage: %freeze [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local loopName = "freeze_" .. target.UserId
        
        if args[2] == "off" then
            activeLoops[loopName] = nil
            return "Unfroze " .. target.Name
        end
        
        if activeLoops[loopName] then return "Already freezing " .. target.Name end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if targetHRP then
                    pcall(function()
                        SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
                    end)
                    targetHRP.Anchored = true
                    stvel(targetHRP)
                end
                
                task.wait(0.1)
            end
            
            -- Unfreeze when stopped
            local targetChar = target.Character
            local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
            if targetHRP then
                targetHRP.Anchored = false
            end
        end)
        
        return "Froze " .. target.Name
    end
    
    Commands["speed"] = function(args)
        if not args[1] then return "Usage: %speed [playername] [value]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local speed = tonumber(args[2]) or 100
        
        local targetChar = target.Character
        local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
        
        if targetHum then
            targetHum.WalkSpeed = speed
            return "Set " .. target.Name .. "'s speed to " .. speed
        end
        
        return "Character not found"
    end
    
    Commands["jumppower"] = function(args)
        if not args[1] then return "Usage: %jumppower [playername] [value]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local power = tonumber(args[2]) or 100
        
        local targetChar = target.Character
        local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
        
        if targetHum then
            targetHum.JumpPower = power
            return "Set " .. target.Name .. "'s jump power to " .. power
        end
        
        return "Character not found"
    end
    
    Commands["sit"] = function(args)
        if not args[1] then return "Usage: %sit [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local targetChar = target.Character
        local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
        
        if targetHum then
            targetHum.Sit = true
            return "Made " .. target.Name .. " sit"
        end
        
        return "Character not found"
    end
    
    Commands["platformstand"] = function(args)
        if not args[1] then return "Usage: %platformstand [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local targetChar = target.Character
        local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
        
        if targetHum then
            targetHum.PlatformStand = args[2] ~= "off"
            return "PlatformStand " .. (args[2] ~= "off" and "Enabled" or "Disabled") .. " for " .. target.Name
        end
        
        return "Character not found"
    end
    
    -- ==================== TOY COMMANDS ====================
    
    Commands["spawntoy"] = function(args)
        if not args[1] then return "Usage: %spawntoy [toyname] [amount]" end
        
        local toyName = args[1]
        local amount = math.min(tonumber(args[2]) or 1, 10)
        
        local realName = ToyList[toyName] or toyName
        
        local _, myHRP, _ = getCharacter()
        if not myHRP then return "Character not found" end
        
        for i = 1, amount do
            task.spawn(function()
                local toy = spawntoy(realName, myHRP.CFrame * CFrame.new(math.random(-5, 5), 5, math.random(-5, 5)))
                if toy then
                    toy.Name = "CmdSpawned_" .. toy.Name
                end
            end)
            task.wait(0.1)
        end
        
        return "Spawned " .. amount .. "x " .. toyName
    end
    
    Commands["despawntoys"] = function(args)
        local inv = workspace[plr.Name .. "SpawnedInToys"]
        if not inv then return "No toys found" end
        
        local count = 0
        for _, toy in ipairs(inv:GetChildren()) do
            if toy.Name:find("CmdSpawned_") or args[1] == "all" then
                pcall(function()
                    DestroyToy:FireServer(toy)
                    count = count + 1
                end)
            end
        end
        
        return "Despawned " .. count .. " toy(s)"
    end
    
    Commands["clearplot"] = function(args)
        local plot = getplot()
        if not plot then return "No plot found" end
        
        local plotItems = workspace.PlotItems[plot.Name]
        if not plotItems then return "No plot items found" end
        
        local count = 0
        for _, item in ipairs(plotItems:GetChildren()) do
            pcall(function()
                DestroyToy:FireServer(item)
                count = count + 1
            end)
        end
        
        return "Cleared " .. count .. " item(s) from plot"
    end
    
    -- ==================== SPAM COMMANDS ====================
    
    Commands["spam"] = function(args)
        if not args[1] then return "Usage: %spam [message] [speed] [on/off]" end
        
        local message = args[1]
        local speed = tonumber(args[2]) or 1
        
        if args[#args] == "off" then
            spamData.active = false
            return "Spam stopped"
        end
        
        if spamData.active then return "Already spamming" end
        
        spamData.active = true
        spamData.message = message
        spamData.speed = speed
        
        task.spawn(function()
            while spamData.active do
                pcall(function()
                    local textChatService = game:GetService("TextChatService")
                    if textChatService.ChatVersion == Enum.ChatVersion.TextChatService then
                        local channel = textChatService.TextChannels:FindFirstChild("RBXGeneral")
                        if channel then
                            channel:SendAsync(message)
                        end
                    else
                        game:GetService("ReplicatedStorage").DefaultChatSystemChatEvents.SayMessageRequest:FireServer(message, "All")
                    end
                end)
                task.wait(speed)
            end
        end)
        
        return "Spamming: '" .. message .. "' every " .. speed .. "s"
    end
    
    Commands["spamstop"] = function(args)
        spamData.active = false
        return "Spam stopped"
    end
    
    -- ==================== TROLL COMMANDS ====================
    
    Commands["annoy"] = function(args)
        if not args[1] then return "Usage: %annoy [playername] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local loopName = "annoy_" .. target.UserId
        
        if args[2] == "off" then
            activeLoops[loopName] = nil
            return "Stopped annoying " .. target.Name
        end
        
        if activeLoops[loopName] then return "Already annoying " .. target.Name end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                local _, myHRP, _ = getCharacter()
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if myHRP and targetHRP then
                    -- Rapidly teleport around them
                    local offsets = {
                        CFrame.new(2, 0, 0),
                        CFrame.new(-2, 0, 0),
                        CFrame.new(0, 0, 2),
                        CFrame.new(0, 0, -2),
                        CFrame.new(0, 5, 0)
                    }
                    
                    for _, offset in ipairs(offsets) do
                        if not activeLoops[loopName] then break end
                        myHRP.CFrame = targetHRP.CFrame * offset
                        task.wait(0.1)
                    end
                end
                
                task.wait(0.2)
            end
        end)
        
        return "Annoying " .. target.Name .. "!"
    end
    
    Commands["spinplayer"] = function(args)
        if not args[1] then return "Usage: %spinplayer [playername] [speed] [on/off]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local loopName = "spinplayer_" .. target.UserId
        local speed = tonumber(args[2]) or 50
        
        if args[#args] == "off" then
            activeLoops[loopName] = nil
            return "Stopped spinning " .. target.Name
        end
        
        if activeLoops[loopName] then return "Already spinning " .. target.Name end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                local targetChar = target.Character
                local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
                
                if targetHRP then
                    pcall(function()
                        SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
                    end)
                    targetHRP.CFrame = targetHRP.CFrame * CFrame.Angles(0, math.rad(speed), 0)
                    targetHRP.AssemblyAngularVelocity = Vector3.new(0, speed * 10, 0)
                end
                
                task.wait()
            end
        end)
        
        return "Spinning " .. target.Name .. " at speed " .. speed
    end
    
    Commands["bomb"] = function(args)
        if not args[1] then return "Usage: %bomb [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local _, myHRP, _ = getCharacter()
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not myHRP or not targetHRP then return "Character not found" end
        
        -- Spawn bomb and teleport to target
        local bomb = spawntoy("Bomb", targetHRP.CFrame)
        if bomb then
            task.wait(0.5)
            pcall(function()
                if BombExplode then
                    BombExplode:FireServer(bomb)
                end
            end)
            return "Bombed " .. target.Name .. "!"
        end
        
        return "Failed to spawn bomb"
    end
    
    -- ==================== MISC UTILITY COMMANDS ====================
    
    Commands["goto"] = function(args)
        if not args[1] then return "Usage: %goto [playername]" end
        return Commands["tpto"](args)
    end
    
    Commands["come"] = function(args)
        if not args[1] then return "Usage: %come [playername]" end
        
        -- Teleport player to you
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local _, myHRP, _ = getCharacter()
        local targetChar = target.Character
        local targetHRP = targetChar and targetChar:FindFirstChild("HumanoidRootPart")
        
        if not myHRP or not targetHRP then return "Character not found" end
        
        pcall(function()
            SetNetOwner:FireServer(targetHRP, targetHRP.CFrame)
        end)
        
        targetHRP.CFrame = myHRP.CFrame * CFrame.new(0, 0, 3)
        stvel(targetHRP)
        
        return "Brought " .. target.Name .. " to you!"
    end
    
    Commands["view"] = function(args)
        if not args[1] then return "Usage: %view [playername] or %view off" end
        
        if args[1] == "off" then
            local _, _, myHum = getCharacter()
            if myHum then
                workspace.CurrentCamera.CameraSubject = myHum
                return "Camera reset to self"
            end
        end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        local targetChar = target.Character
        local targetHum = targetChar and targetChar:FindFirstChildOfClass("Humanoid")
        
        if targetHum then
            workspace.CurrentCamera.CameraSubject = targetHum
            return "Now viewing " .. target.Name
        end
        
        return "Character not found"
    end
    
    Commands["refresh"] = function(args)
        local char = plr.Character
        if char then
            local hum = char:FindFirstChildOfClass("Humanoid")
            if hum then
                hum.Health = 0
                return "Character refreshed"
            end
        end
        return "Character not found"
    end
    
    Commands["reset"] = function(args)
        return Commands["refresh"](args)
    end
    
    Commands["heal"] = function(args)
        local _, _, myHum = getCharacter()
        if myHum then
            myHum.Health = myHum.MaxHealth
            return "Healed to full health"
        end
        return "Character not found"
    end
    
    Commands["god"] = function(args)
        local _, _, myHum = getCharacter()
        if not myHum then return "Character not found" end
        
        local loopName = "godmode"
        
        if args[1] == "off" then
            activeLoops[loopName] = nil
            return "God mode disabled"
        end
        
        if activeLoops[loopName] then return "God mode already active" end
        
        activeLoops[loopName] = true
        
        task.spawn(function()
            while activeLoops[loopName] do
                pcall(function()
                    if myHum.Health < myHum.MaxHealth then
                        myHum.Health = myHum.MaxHealth
                    end
                end)
                task.wait(0.1)
            end
        end)
        
        return "God mode enabled - Use %god off to disable"
    end
    
    Commands["invisible"] = function(args)
        local char = plr.Character
        if not char then return "Character not found" end
        
        local state = args[1] ~= "off"
        
        for _, part in ipairs(char:GetDescendants()) do
            if part:IsA("BasePart") and part.Name ~= "HumanoidRootPart" then
                part.Transparency = state and 1 or 0
            end
            if part:IsA("Decal") or part:IsA("Texture") then
                part.Transparency = state and 1 or 0
            end
        end
        
        return state and "You are now invisible!" or "You are visible again"
    end
    
    Commands["naked"] = function(args)
        local char = plr.Character
        if not char then return "Character not found" end
        
        for _, acc in ipairs(char:GetChildren()) do
            if acc:IsA("Accessory") then
                acc:Destroy()
            end
        end
        
        return "Removed all accessories"
    end
    
    Commands["size"] = function(args)
        local size = tonumber(args[1]) or 1
        size = math.clamp(size, 0.1, 10)
        
        local char = plr.Character
        if not char then return "Character not found" end
        
        local hrp = char:FindFirstChild("HumanoidRootPart")
        if hrp then
            for _, part in ipairs(char:GetDescendants()) do
                if part:IsA("BasePart") then
                    part.Size = part.Size * size
                end
            end
            return "Size set to " .. size
        end
        
        return "Failed to resize"
    end
    
    Commands["dance"] = function(args)
        local danceId = args[1] or "1"
        local dances = {
            ["1"] = "rbxassetid://507771019",
            ["2"] = "rbxassetid://507776043",
            ["3"] = "rbxassetid://507777268",
            ["4"] = "rbxassetid://507777451",
            ["5"] = "rbxassetid://507777623",
            ["6"] = "rbxassetid://507777623",
            ["7"] = "rbxassetid://507777826",
            ["8"] = "rbxassetid://507777968",
            ["9"] = "rbxassetid://507778093",
            ["10"] = "rbxassetid://507778201"
        }
        
        local char = plr.Character
        local hum = char and char:FindFirstChildOfClass("Humanoid")
        if not hum then return "Character not found" end
        
        local animator = hum:FindFirstChild("Animator") or hum:WaitForChild("Animator", 1)
        if not animator then return "Animator not found" end
        
        local anim = Instance.new("Animation")
        anim.AnimationId = dances[danceId] or dances["1"]
        
        local track = animator:LoadAnimation(anim)
        track:Play()
        
        return "Playing dance " .. danceId
    end
    
    Commands["emote"] = function(args)
        if not args[1] then return "Usage: %emote [emotename]" end
        
        local emotes = {
            ["laugh"] = "rbxassetid://507770818",
            ["cheer"] = "rbxassetid://507770239",
            ["point"] = "rbxassetid://507770453",
            ["wave"] = "rbxassetid://507770239",
            ["salute"] = "rbxassetid://507770818",
            ["tilt"] = "rbxassetid://507770818",
            ["stadium"] = "rbxassetid://507770818"
        }
        
        local char = plr.Character
        local hum = char and char:FindFirstChildOfClass("Humanoid")
        if not hum then return "Character not found" end
        
        local animator = hum:FindFirstChild("Animator") or hum:WaitForChild("Animator", 1)
        if not animator then return "Animator not found" end
        
        local animId = emotes[args[1]:lower()] or "rbxassetid://507770818"
        local anim = Instance.new("Animation")
        anim.AnimationId = animId
        
        local track = animator:LoadAnimation(anim)
        track:Play()
        
        return "Playing emote: " .. args[1]
    end
    
    -- ==================== SERVER COMMANDS ====================
    
    Commands["serverhop"] = function(args)
        local servers = {}
        local cursor = ""
        
        repeat
            local url = "https://games.roblox.com/v1/games/" .. game.PlaceId .. "/servers/Public?sortOrder=Asc&limit=100" .. (cursor ~= "" and "&cursor=" .. cursor or "")
            local success, result = pcall(function()
                return HttpService:JSONDecode(game:HttpGet(url))
            end)
            
            if success and result then
                for _, server in ipairs(result.data) do
                    if server.id ~= game.JobId and server.playing < server.maxPlayers then
                        table.insert(servers, server)
                    end
                end
                cursor = result.nextPageCursor or ""
            else
                cursor = ""
            end
        until cursor == "" or #servers >= 10
        
        if #servers > 0 then
            local server = servers[math.random(1, #servers)]
            TeleportService:TeleportToPlaceInstance(game.PlaceId, server.id, plr)
            return "Server hopping..."
        end
        
        return "No servers found"
    end
    
    Commands["join"] = function(args)
        if not args[1] then return "Usage: %join [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        -- This would require external tracking of JobIds
        return "Feature requires player tracking - Use %serverhop instead"
    end
    
    Commands["players"] = function(args)
        local list = {}
        for _, player in ipairs(Players:GetPlayers()) do
            table.insert(list, player.Name .. " (" .. player.DisplayName .. ")")
        end
        return "Players (" .. #list .. "): " .. table.concat(list, ", ")
    end
    
    Commands["serverinfo"] = function(args)
        local info = {
            "Place ID: " .. game.PlaceId,
            "Job ID: " .. game.JobId,
            "Players: " .. #Players:GetPlayers(),
            "Max Players: " .. Players.MaxPlayers,
            "Server Time: " .. os.date("%H:%M:%S"),
            "FPS: " .. math.floor(1 / RunService.RenderStepped:Wait()),
            "Ping: " .. math.floor(game:GetService("Stats").Network.ServerStatsItem["Data Ping"]:GetValue()) .. "ms"
        }
        return table.concat(info, "\n")
    end
    
    -- ==================== DEFENCE COMMANDS (bestehende) ====================
    
    Commands["antigrab"] = function(args)
        local state = cmdToggle("AntiGrab", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Grab " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antiblob"] = function(args)
        local state = cmdToggle("AntiBlobman", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Blobman " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antiexplode"] = function(args)
        local state = cmdToggle("AntiExplode", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Explosion " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antiburn"] = function(args)
        local state = cmdToggle("AntiBurn", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Burn " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antivoid"] = function(args)
        local state = cmdToggle("AntiVoid", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Void " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antikick"] = function(args)
        local state = cmdToggle("AntiKick", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Kick " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antisticky"] = function(args)
        local state = cmdToggle("AntiSticky", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Sticky " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antilag"] = function(args)
        local state = cmdToggle("AntiLag", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Lag " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["autoantilag"] = function(args)
        local state = cmdToggle("AutoAntiLag", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Auto Anti Lag " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antiloop"] = function(args)
        local state = cmdToggle("AntiLoop", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Loop " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["autoreset"] = function(args)
        local state = cmdToggle("AutoReset", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Auto Reset " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["looptp"] = function(args)
        local state = cmdToggle("LoopTp", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Loop TP " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["gucci"] = function(args)
        local state = cmdToggle("GucciMethod", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Gucci Method " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["pcld"] = function(args)
        local state = cmdToggle("PCLDbreak", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "PCLD Break " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antinet"] = function(args)
        local state = cmdToggle("SpawnToy", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Net Owner " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["deletelegs"] = function(args)
        local state = cmdToggle("Delete Legs", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Delete Legs " .. (state and "Enabled" or "Disabled")
    end
    
    -- ==================== COMBAT COMMANDS (bestehende) ====================
    
    Commands["superstrength"] = function(args)
        local state = cmdToggle("SuperStrength", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Super Strength " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["killgrab"] = function(args)
        local state = cmdToggle("KillGrab", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Kill Grab " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["massless"] = function(args)
        local state = cmdToggle("MasslessGrab", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Massless Grab " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["spingrab"] = function(args)
        local state = cmdToggle("SpinGrab", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Spin Grab " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["ragdollgrab"] = function(args)
        local state = cmdToggle("RagdollGrab", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Ragdoll Grab " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["kickgrab"] = function(args)
        local state = cmdToggle("KickGrab", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Kick Grab " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["strength"] = function(args)
        if args[1] then
            local val = cmdSlider("Strength", args[1])
            return "Strength set to " .. tostring(val)
        end
        return "Usage: %strength [value]"
    end
    
    Commands["spinspeed"] = function(args)
        if args[1] then
            local val = cmdSlider("SpinSpeed", args[1])
            return "Spin Speed set to " .. tostring(val)
        end
        return "Usage: %spinspeed [value]"
    end
    
    Commands["jerkspeed"] = function(args)
        if args[1] then
            local val = cmdSlider("JerkSpeed", args[1])
            return "Jerk Speed set to " .. tostring(val)
        end
        return "Usage: %jerkspeed [value]"
    end
    
    -- ==================== PLAYER COMMANDS (bestehende) ====================
    
    Commands["fly"] = function(args)
        local state = cmdToggle("FlightToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Flight " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["walkspeed"] = function(args)
        local state = cmdToggle("WalkspeedToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Walkspeed " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["jumppower"] = function(args)
        local state = cmdToggle("JumpPowerToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Jump Power " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["noclip"] = function(args)
        local state = cmdToggle("NoclipToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Noclip " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["infjump"] = function(args)
        local state = cmdToggle("InfJumpToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Inf Jump " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["spin"] = function(args)
        local state = cmdToggle("CharacterSpinToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Character Spin " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["walkspeedval"] = function(args)
        if args[1] then
            local val = cmdSlider("WalkSpeedVal", args[1])
            return "Walk Speed set to " .. tostring(val)
        end
        return "Usage: %walkspeedval [value]"
    end
    
    Commands["jumppowerval"] = function(args)
        if args[1] then
            local val = cmdSlider("JumpPowerVal", args[1])
            return "Jump Power set to " .. tostring(val)
        end
        return "Usage: %jumppowerval [value]"
    end
    
    Commands["flightspeed"] = function(args)
        if args[1] then
            local val = cmdSlider("FlightSpeedVal", args[1])
            return "Flight Speed set to " .. tostring(val)
        end
        return "Usage: %flightspeed [value]"
    end
    
    Commands["spinspeedval"] = function(args)
        if args[1] then
            local val = cmdSlider("SpinSpeedVal", args[1])
            return "Spin Speed set to " .. tostring(val)
        end
        return "Usage: %spinspeedval [value]"
    end
    
    Commands["tp"] = function(args)
        if not args[1] then return "Usage: %tp [playername]" end
        return Commands["tpto"](args)
    end
    
    Commands["tpmouse"] = function(args)
        if Mouse and Mouse.Hit then
            local _, myHRP, _ = getCharacter()
            if myHRP then
                myHRP.CFrame = Mouse.Hit * CFrame.new(0, 5, 0)
                stvel(myHRP)
                return "Teleported to mouse position"
            end
            return "Character not found"
        end
        return "Mouse not available"
    end
    
    Commands["tphouse"] = function(args)
        local plot = getplot()
        if plot then
            local housePos = plot:FindFirstChild("HouseSpawn") or plot:FindFirstChild("SpawnLocation")
            if housePos then
                local _, myHRP, _ = getCharacter()
                if myHRP then
                    myHRP.CFrame = housePos.CFrame
                    stvel(myHRP)
                    return "Teleported to house"
                end
            end
        end
        return "No house found"
    end
    
    -- ==================== VISUAL COMMANDS (bestehende) ====================
    
    Commands["playeresp"] = function(args)
        local state = cmdToggle("PlayerESP", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Player ESP " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["serveresp"] = function(args)
        local state = cmdToggle("ServerESP", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Server ESP " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["nameesp"] = function(args)
        local state = cmdToggle("NameESP", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Name ESP " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["stickyesp"] = function(args)
        local state = cmdToggle("StickyESP", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Sticky ESP " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["thirdperson"] = function(args)
        local state = cmdToggle("ThirdPerson", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Third Person " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["shaders"] = function(args)
        local state = cmdToggle("Shaders", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Shaders " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["particles"] = function(args)
        local state = cmdToggle("Particles", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Particles " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["customline"] = function(args)
        local state = cmdToggle("CustomLine", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Custom Line " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["linestyle"] = function(args)
        if args[1] then
            local styles = {
                "Aura", "Angel Aura", "Dark Aura", "Electric", "Lightning", "Plasma",
                "Fire", "Blue Fire", "Poison", "Slime", "Ghost", "Ice", "Crystal",
                "Gold", "Stars", "Hearts", "Candy", "Rainbow", "Cyber", "Matrix",
                "Void", "Blood"
            }
            for _, style in ipairs(styles) do
                if style:lower():gsub(" ", "") == args[1]:lower():gsub(" ", "") then
                    local val = cmdDropdown("LineTexture", style)
                    return "Line style set to " .. style
                end
            end
            return "Invalid style. Use: Aura, AngelAura, DarkAura, Electric, Lightning, Plasma, Fire, BlueFire, Poison, Slime, Ghost, Ice, Crystal, Gold, Stars, Hearts, Candy, Rainbow, Cyber, Matrix, Void, Blood"
        end
        return "Usage: %linestyle [style]"
    end
    
    Commands["fov"] = function(args)
        if args[1] then
            local val = cmdSlider("FOV", args[1])
            return "FOV set to " .. tostring(val)
        end
        return "Usage: %fov [value]"
    end
    
    Commands["time"] = function(args)
        if args[1] then
            local val = cmdSlider("TimeOfDay", args[1])
            return "Time set to " .. tostring(val) .. ":00"
        end
        return "Usage: %time [0-24]"
    end
    
    Commands["blackhole"] = function(args)
        local state = cmdToggle("ReplaceBlackholes", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Blackhole Replacer " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["bhstyle"] = function(args)
        if args[1] then
            local styles = {
                ["white"] = "White Void Style",
                ["blue"] = "Blue Void Style",
                ["pixel"] = "Pixel Cat Style",
                ["custom1"] = "Custom 1",
                ["custom2"] = "Custom 2"
            }
            for key, value in pairs(styles) do
                if key:lower() == args[1]:lower() then
                    local val = cmdDropdown("BlackholeStyle", value)
                    return "Blackhole style set to " .. value
                end
            end
        end
        return "Usage: %bhstyle [white/blue/pixel/custom1/custom2]"
    end
    
    -- ==================== BLOBMAN COMMANDS (bestehende) ====================
    
    Commands["blobtarget"] = function(args)
        if not args[1] then return "Usage: %blobtarget [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        BlobmanTarget:SetValue(target.DisplayName .. " (" .. target.Name .. ")")
        return "Blobman target set to " .. target.Name
    end
    
    Commands["bloblock"] = function(args)
        local state = cmdToggle("Blob_Blob Lock", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Blob Lock " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["blobkill"] = function(args)
        local state = cmdToggle("Blob_Kill", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Blob Kill " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["blobkick"] = function(args)
        local state = cmdToggle("Blob_Kick", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Blob Kick " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["autositsblob"] = function(args)
        local state = cmdToggle("AutoSitBlobZ", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Auto Sit Blob " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["antivel"] = function(args)
        local state = cmdToggle("AntiVelocity", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Anti Velocity " .. (state and "Enabled" or "Disabled")
    end
    
    -- ==================== NO BLOBMAN COMMANDS (bestehende) ====================
    
    Commands["grabtarget"] = function(args)
        if not args[1] then return "Usage: %grabtarget [playername]" end
        
        local target = getPlayerByName(args[1])
        if not target then return "Player not found: " .. args[1] end
        
        GrabTarget:SetValue(target.DisplayName .. " (" .. target.Name .. ")")
        return "Grab target set to " .. target.Name
    end
    
    Commands["loopgrab"] = function(args)
        local state = cmdToggle("NoBlob_Loop Grab", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Loop Grab " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["loopgrabkick"] = function(args)
        local state = cmdToggle("NoBlob_Loop Grab(Kick)", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Loop Grab (Kick) " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["grabkill"] = function(args)
        local state = cmdToggle("NoBlob_Kill", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Grab Kill " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["enableragdoll"] = function(args)
        local state = cmdToggle("EnableRagdoll", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Ragdoll Target " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["grabantikick"] = function(args)
        local state = cmdToggle("EnableGrabAntiKick", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Grab Anti Kick " .. (state and "Enabled" or "Disabled")
    end
    
    -- ==================== MISC COMMANDS (bestehende) ====================
    
    Commands["furtherreach"] = function(args)
        local state = cmdToggle("FurtherReachLine", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Further Reach " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["gradient"] = function(args)
        local state = cmdToggle("GradientLine", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Gradient Line " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["fasterescape"] = function(args)
        local state = cmdToggle("FasterEscape", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Faster Escape " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["autohouse"] = function(args)
        local state = cmdToggle("AutoHouseTeleport", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Auto House TP " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["autoslots"] = function(args)
        local state = cmdToggle("AutoSlots", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Auto Slots " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["triggerbot"] = function(args)
        local state = cmdToggle("TriggerbotToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Triggerbot " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["aimbot"] = function(args)
        local state = cmdToggle("AimbotToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Aimbot " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["soundspam"] = function(args)
        local state = cmdToggle("SoundSpamToggle", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Sound Spam " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["waterwalk"] = function(args)
        local state = cmdToggle("WaterWalk", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Water Walk " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["loopragdoll"] = function(args)
        local state = cmdToggle("LoopRagdoll", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Loop Ragdoll " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["kicknotify"] = function(args)
        local state = cmdToggle("KickNotify", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Kick Notify " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["nobarrier"] = function(args)
        local state = cmdToggle("NoBarrierCollision", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "No Barrier " .. (state and "Enabled" or "Disabled")
    end
    
    -- ==================== LAG COMMANDS (bestehende) ====================
    
    Commands["linelag"] = function(args)
        local state = cmdToggle("LineLag", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Line Lag " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["packetlag"] = function(args)
        local state = cmdToggle("PacketLag", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Packet Lag " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["lps"] = function(args)
        if args[1] then
            local val = cmdSlider("LPS", args[1])
            return "Lines Per Second set to " .. tostring(val)
        end
        return "Usage: %lps [value]"
    end
    
    Commands["packets"] = function(args)
        if args[1] then
            local val = cmdSlider("Packets", args[1])
            return "Packet Strength set to " .. tostring(val)
        end
        return "Usage: %packets [value]"
    end
    
    -- ==================== ANIMATION COMMANDS (bestehende) ====================
    
    Commands["animation"] = function(args)
        if args[1] then
            local anims = {struggle = "Struggle", spasm = "Spasm", headthrow = "Headthrow", dab = "Dab"}
            for key, value in pairs(anims) do
                if key:lower() == args[1]:lower() then
                    cmdDropdown("AnimationDropdown", value)
                    return "Animation set to " .. value
                end
            end
            return "Invalid animation. Use: struggle, spasm, headthrow, dab"
        end
        return "Usage: %animation [name]"
    end
    
    Commands["animtoggle"] = function(args)
        local state = cmdToggle("ToggleAnimation", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Animation " .. (state and "Enabled" or "Disabled")
    end
    
    Commands["animspeed"] = function(args)
        if args[1] then
            local val = cmdSlider("AnimationSpeed", args[1])
            return "Animation Speed set to " .. tostring(val)
        end
        return "Usage: %animspeed [value]"
    end
    
    -- ==================== WHITELIST COMMANDS (bestehende) ====================
    
    Commands["whitelist"] = function(args)
        local state = cmdToggle("Whitelist", args[1] == "on" and true or args[1] == "off" and false or nil)
        return "Whitelist " .. (state and "Enabled" or "Disabled")
    end
    
    -- ==================== SERVER COMMANDS (bestehende) ====================
    
    Commands["destroyserver"] = function(args)
        local blob = hum and hum.SeatPart and hum.SeatPart.Parent and hum.SeatPart.Parent.Name == "CreatureBlobman" and hum.SeatPart.Parent
        if not blob then return "You need to be in a Blobman!" end
        
        task.spawn(function()
            blob.Name = "blob"
            local CD = blob.BlobmanSeatAndOwnerScript.CreatureDrop
            local CR = blob.BlobmanSeatAndOwnerScript.CreatureRelease
            local CG = blob.BlobmanSeatAndOwnerScript.CreatureGrab
            local pos = blob.HumanoidRootPart.CFrame * CFrame.new(0, 30, 0)
            
            for i, v in game.Players:GetPlayers() do
                pcall(function()
                    if v ~= plr and v.Character and v.Character:FindFirstChild("HumanoidRootPart") and (not WhitelistEnabled or not v:IsFriendsWith(plr.UserId)) then
                        blob.HumanoidRootPart.CFrame = v.Character.HumanoidRootPart.CFrame
                        task.wait(0.2)
                        CG:FireServer(nil, v.Character.HumanoidRootPart, blob.RightDetector.RightWeld)
                        CR:FireServer(blob.RightDetector.RightWeld)
                    end
                end)
                task.wait(0.1)
            end
            
            blob.HumanoidRootPart.CFrame = pos
            task.wait(0.1)
            blob.HumanoidRootPart.Anchored = true
            
            local rotation = 0
            for i, v in game.Players:GetPlayers() do
                pcall(function()
                    if v ~= plr and v.Character and v.Character:FindFirstChild("HumanoidRootPart") and isnetworkowner(v.Character.HumanoidRootPart) and (not WhitelistEnabled or not v:IsFriendsWith(plr.UserId)) then
                        local bg = Instance.new("BodyGyro", v.Character.HumanoidRootPart)
                        bg.CFrame = CFrame.new(0, 0, 0)
                        stvel(blob.HumanoidRootPart)
                        stvel(v.Character.HumanoidRootPart)
                        rotation = rotation + 30
                        v.Character.HumanoidRootPart.CFrame = CFrame.new(HRP.Position) * CFrame.Angles(0, math.rad(rotation), 0) * CFrame.new(i, 0, 0)
                        stvel(blob.HumanoidRootPart)
                        task.wait(0.2)
                        sno(v.Character.HumanoidRootPart)
                        DestroyLine:FireServer(v.Character.HumanoidRootPart)
                        task.wait()
                        CG:FireServer(nil, v.Character.HumanoidRootPart, blob.RightDetector.RightWeld)
                    end
                end)
                task.wait(0.1)
            end
            
            task.wait(0.1)
            blob.HumanoidRootPart.Anchored = false
            DestroyToy:FireServer(inv.blob)
        end)
        
        return "Destroying server..."
    end
    
    Commands["rejoin"] = function(args)
        TeleportService:Teleport(game.PlaceId, plr)
        return "Rejoining..."
    end
    
    Commands["unload"] = function(args)
        for i, v in Toggles do
            if v.Value then
                v:SetValue(false)
            end
        end
        if game.CoreGui:FindFirstChild("SnowGui") then
            game.CoreGui.SnowGui:Destroy()
        end
        workspace.Camera.Blur.Size = 0
        Library:Unload()
        return "Script unloaded!"
    end
    
    -- ==================== HELP COMMAND ====================
    
    Commands["help"] = function(args)
        local categories = {
            "=== COPY & FOLLOW ===",
            "%copyuser [player] [on/off] - Copy user's movements exactly",
            "%copystop [player/all] - Stop copying",
            "%orbit [player] [speed] [dist] [on/off] - Orbit around player",
            "%orbitstop [player/all] - Stop orbiting",
            "%follow [player] [dist] [on/off] - Follow player",
            "%unfollow [player/all] - Stop following",
            "",
            "=== TELEPORT ===",
            "%tp [player] / %tpto [player] - Teleport to player",
            "%tpbehind [player] [dist] - Teleport behind player",
            "%tpabove [player] [height] - Teleport above player",
            "%tprandom [range] - Random teleport",
            "%tpwaypoint [name] - Teleport to waypoint",
            "%setwaypoint [name] - Save current position",
            "%tpmouse - Teleport to mouse",
            "%tphouse - Teleport to your house",
            "%goto [player] - Same as tp",
            "%come [player] - Bring player to you",
            "",
            "=== GRAB & MANIPULATE ===",
            "%bring [player] - Bring player to you",
            "%grab [player] [on/off] - Grab and hold player",
            "%throw [player] [power] - Throw player away",
            "%fling [player] [power] - Fling player randomly",
            "%freeze [player] [on/off] - Freeze/unfreeze player",
            "%spinplayer [player] [speed] [on/off] - Spin player",
            "%speed [player] [value] - Set player walkspeed",
            "%jumppower [player] [value] - Set player jumppower",
            "%sit [player] - Make player sit",
            "%platformstand [player] [on/off] - Ragdoll player",
            "",
            "=== KILL ===",
            "%kill [player] - Kill player",
            "%loopkill [player] [on/off] - Loop kill player",
            "%killall - Kill all players",
            "%bomb [player] - Spawn bomb on player",
            "",
            "=== TROLL ===",
            "%annoy [player] [on/off] - Rapidly teleport around player",
            "%view [player/off] - Spectate player",
            "",
            "=== TOYS ===",
            "%spawntoy [name] [amount] - Spawn toy",
            "%despawntoys [all] - Despawn toys",
            "%clearplot - Clear your plot",
            "",
            "=== SELF ===",
            "%refresh / %reset - Reset character",
            "%heal - Heal to full",
            "%god [on/off] - God mode",
            "%invisible [on/off] - Toggle invisibility",
            "%naked - Remove all accessories",
            "%size [value] - Resize character",
            "%dance [1-10] - Play dance animation",
            "%emote [name] - Play emote (laugh/cheer/point/wave/salute)",
            "",
            "=== SERVER ===",
            "%players - List all players",
            "%serverinfo - Server information",
            "%serverhop - Join different server",
            "%rejoin - Rejoin current server",
            "%destroyserver - Destroy server (needs Blobman)",
            "%unload - Unload script",
            "",
            "=== SPAM ===",
            "%spam [message] [speed] [on/off] - Chat spam",
            "%spamstop - Stop spamming",
            "",
            "Type %cmds for full command list"
        }
        return table.concat(categories, "\n")
    end
    
    Commands["cmds"] = function(args)
        local cmdList = {}
        for cmd, _ in pairs(Commands) do
            table.insert(cmdList, "%" .. cmd)
        end
        table.sort(cmdList)
        
        -- Split into chunks if too long
        local chunks = {}
        local currentChunk = {}
        local currentLen = 0
        
        for _, cmd in ipairs(cmdList) do
            if currentLen + #cmd + 2 > 150 then
                table.insert(chunks, table.concat(currentChunk, ", "))
                currentChunk = {cmd}
                currentLen = #cmd
            else
                table.insert(currentChunk, cmd)
                currentLen = currentLen + #cmd + 2
            end
        end
        
        if #currentChunk > 0 then
            table.insert(chunks, table.concat(currentChunk, ", "))
        end
        
        return "Commands (" .. #cmdList .. " total):\n" .. table.concat(chunks, "\n")
    end
    
    -- ==================== CHAT HANDLER ====================
    
    local function handleChat(message)
        if message:sub(1, 1) ~= "%" then return end
        
        local args = {}
        for arg in message:sub(2):gmatch("%S+") do
            table.insert(args, arg:lower())
        end
        
        local cmd = args[1]
        table.remove(args, 1)
        
        if Commands[cmd] then
            local success, result = pcall(function()
                return Commands[cmd](args)
            end)
            
            if success then
                if result then
                    notify(result)
                end
            else
                warn("[Pexus Command Error] " .. tostring(result))
                notify("Error: " .. tostring(result))
            end
        else
            notify("Unknown command: %" .. cmd .. " - Use %help")
        end
    end
    
    -- Connect to chat
    plr.Chatted:Connect(function(message)
        handleChat(message)
    end)
    
    print("[Pexus] Chat Commands loaded! Use %help for commands")
    notify("Chat Commands loaded! Type %help")
end

-- Disable game correction UI
game:GetService("Players").LocalPlayer.PlayerGui.GameCorrectionsGui.GameCorrectionsUiController.Enabled = false
