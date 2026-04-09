const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Server läuft");
});

app.get("/getscript", (req, res) => {

    const script = `local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local CoreGui = game:GetService("CoreGui")

loadstring(game:HttpGet('https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source'))()

local repo = "https://raw.githubusercontent.com/deividcomsono/Obsidian/main/"

local Library = loadstring(game:HttpGet(repo .. "Library.lua"))()
local ThemeManager = loadstring(game:HttpGet(repo .. "addons/ThemeManager.lua"))()
local SaveManager = loadstring(game:HttpGet(repo .. "addons/SaveManager.lua"))()

local Options = Library.Options
local Toggles = Library.Toggles

Library.ForceCheckbox = false

local Window = Library:CreateWindow({
    Title = "Pexus",
    Footer = "Pexus",
    NotifySide = "Right",
    ShowCustomCursor = true,
})

local Tabs = {
    Main = Window:AddTab("Main"),
    Defense = Window:AddTab("Antis"),
    Target = Window:AddTab("Target"),
    Grab = Window:AddTab("Grabs"),
    Player = Window:AddTab("Player"),
    Misc = Window:AddTab("Misc"),
    Fun = Window:AddTab("Fun"),
    Keybinds = Window:AddTab("Keybinds"),
    Auras = Window:AddTab("Auras"),
    ["UI Settings"] = Window:AddTab("UI Settings")
}
-- SERVICES
local Players = game:GetService("Players")

-- MAIN GROUP (LEFT)
local MainGroup = Tabs.Main:AddLeftGroupbox("Home")

-- RIGHT INFO GROUP
local InfoGroup = Tabs.Main:AddRightGroupbox("Info")

--------------------------------------------------
-- GREETING SYSTEM
--------------------------------------------------
local function getGreeting()
    local hour = tonumber(os.date("%H"))

    if hour >= 5 and hour < 12 then
        return "Good Morning"
    elseif hour >= 12 and hour < 18 then
        return "Good Afternoon"
    elseif hour >= 18 and hour < 22 then
        return "Good Evening"
    end
end

MainGroup:AddLabel(getGreeting() .. ", welcome back 👋")
MainGroup:AddLabel("Have fun playing with Pexus")
MainGroup:AddDivider()

--------------------------------------------------
-- INFO SYSTEM (RUNTIME + PLAYERS + CLOCK)
--------------------------------------------------
local startTime = tick()

local runtimeLabel = InfoGroup:AddLabel("⏱️ Runtime: 00:00:00")
local playerLabel = InfoGroup:AddLabel("👥 Players: 0")
local clockLabel = InfoGroup:AddLabel("🕒 Time: 00:00:00")

InfoGroup:AddDivider()

-- FORMAT RUNTIME
local function formatTime(seconds)
    local hrs = math.floor(seconds / 3600)
    local mins = math.floor((seconds % 3600) / 60)
    local secs = math.floor(seconds % 60)
    return string.format("%02d:%02d:%02d", hrs, mins, secs)
end

-- GET REAL CLOCK TIME
local function getClock()
    return os.date("%H:%M:%S")
end

-- LIVE UPDATE LOOP
task.spawn(function()
    while true do
        task.wait(1)

        -- Runtime
        local runtime = tick() - startTime
        runtimeLabel:SetText("⏱️ Runtime: " .. formatTime(runtime))

        -- Players
        local playerCount = #Players:GetPlayers()
        playerLabel:SetText("👥 Players: " .. playerCount)

        -- Real Time Clock
        clockLabel:SetText("🕒 Time: " .. getClock())
    end
end)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")
local PS = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local R = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = workspace
local Player = PS.LocalPlayer
local Camera = Workspace.CurrentCamera

local CE = RS:WaitForChild("CharacterEvents", 10)
local BeingHeld = Player:WaitForChild("IsHeld", 10)
local StruggleEvent = CE and CE:WaitForChild("Struggle")

local function notify(title, content, duration)
    Library:Notify({
        Title = title or "Notification",
        Description = content or "",
        Time = duration or 5,
    })
end

local function sendHubLoadedMessage()
    local message = " Pexus Loaded. "
    local sent = false

    pcall(function()
        local chatEvents = ReplicatedStorage:FindFirstChild("DefaultChatSystemChatEvents")
        if chatEvents then
            local say = chatEvents:FindFirstChild("SayMessageRequest")
            if say and typeof(say.FireServer) == "function" then
                say:FireServer(message, "All")
                sent = true
            end
        end
    end)

    if not sent then
        pcall(function()
            StarterGui:SetCore("ChatMakeSystemMessage", {
                Text = message;
                Color = Color3.fromRGB(255, 170, 0);
                Font = Enum.Font.SourceSansBold;
                FontSize = Enum.FontSize.Size18;
            })
        end)
    end
end

task.spawn(function()
    task.wait(0,1)
    sendHubLoadedMessage()
end)

local paintPartsBackup = {}
local paintConnections = {}

local function deleteAllPaintParts()
    for _, obj in ipairs(Workspace:GetDescendants()) do
        if obj:IsA("BasePart") and obj.Name == "PaintPlayerPart" then
            local clone = obj:Clone()
            clone.Archivable = true

            paintPartsBackup[obj:GetDebugId()] = {
                clone = clone,
                parent = obj.Parent
            }

            obj:Destroy()
        end
    end
end

local function restorePaintParts()
    for _, data in pairs(paintPartsBackup) do
        if data.clone and data.parent then
            data.clone.Parent = data.parent
        end
    end

    paintPartsBackup = {}
end
local function watchNewPaintParts()
	table.insert(paintConnections, Workspace.DescendantAdded:Connect(function(obj)
		if obj:IsA("BasePart") and obj.Name == "PaintPlayerPart" then
			task.defer(function()
				if obj and obj.Parent then
					local clone = obj:Clone()
					clone.Archivable = true
					paintPartsBackup[obj:GetDebugId()] = {
						clone = clone,
						parent = obj.Parent
					}
					obj:Destroy()
				end
			end)
		end
	end))
end
local function disconnectWatchers()
	for _, conn in ipairs(paintConnections) do
		if conn.Connected then
			conn:Disconnect()
		end
	end
	paintConnections = {}
end
local function setTouchQuery(state)
	local char = Workspace:FindFirstChild(Player.Name)
	if not char then
		return
	end
	for _, v in ipairs(char:GetChildren()) do
		if v:IsA("Part") or v:IsA("BasePart") then
			v.CanTouch = state
			v.CanQuery = state
		end
	end
end
local antiGucciConnectionTrain
local safePositionTrain
local restoreFramesTrain = 0
local function startAntiGucciTrain()
	local character = Player.Character or Player.CharacterAdded:Wait()
	local humanoid = character:WaitForChild("Humanoid")
	local rootPart = character:WaitForChild("HumanoidRootPart")
	safePositionTrain = rootPart.Position
	local folder = workspace.Map.AlwaysHereTweenedObjects
	local train = folder and folder:FindFirstChild("Train")
	local seat
	if train then
		for _, d in ipairs(train:GetDescendants()) do
			if d:IsA("Seat") then
				seat = d
				break
			end
		end
	end
	if seat then
		rootPart.CFrame = seat.CFrame + Vector3.new(0, 2, 0)
		seat:Sit(humanoid)
	end
	humanoid:GetPropertyChangedSignal("Jump"):Connect(function()
		if humanoid.Jump and humanoid.Sit then
			restoreFramesTrain = 15
			safePositionTrain = rootPart.Position
		end
	end)
	if antiGucciConnectionTrain then
		antiGucciConnectionTrain:Disconnect()
	end
	antiGucciConnectionTrain = R.Heartbeat:Connect(function()
		if not rootPart or not humanoid then
			return
		end
		ReplicatedStorage.CharacterEvents.RagdollRemote:FireServer(rootPart, 0)
		if restoreFramesTrain > 0 then
			rootPart.CFrame = CFrame.new(safePositionTrain)
			restoreFramesTrain = restoreFramesTrain - 1
		end
	end)
	task.spawn(function()
		while humanoid.Sit do
			task.wait(0)
		end
		task.wait(0)
		rootPart.CFrame = CFrame.new(safePositionTrain)
	end)
end
local function stopAntiGucciTrain()
	if antiGucciConnectionTrain then
		antiGucciConnectionTrain:Disconnect()
		antiGucciConnectionTrain = nil
	end
	local trainFolder = workspace.Map.AlwaysHereTweenedObjects
	if trainFolder and trainFolder:FindFirstChild("Train") then
		ResetPlayer(game.Players.LocalPlayer)
	end
end
local DefenseGroup = Tabs.Defense:AddLeftGroupbox("Defense Main")
local DefenseExtra = Tabs.Defense:AddRightGroupbox("Extra Defense")
local antiGrabExplosionConn, antiGrabHeldConn, antiGrabStruggleConn, antiGrabHumConn, antiGrabAnchorConn
local antiGrabRootCF, antiGrabRootPos, antiGrabHardFreeze = nil, nil, false
local function antiGrabUnfreeze(char)
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.Anchored = false
		if hrp:FindFirstChild("FreezeJoint") then
			hrp.FreezeJoint:Destroy()
		end
	end
	antiGrabHardFreeze = false
	if antiGrabAnchorConn then
		antiGrabAnchorConn:Disconnect()
		antiGrabAnchorConn = nil
	end
end
local function antiGrabFreezeInPlace(char)
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end
	antiGrabRootCF = hrp.CFrame
	antiGrabRootPos = hrp.Position
	antiGrabHardFreeze = true
	if not hrp:FindFirstChild("FreezeJoint") then
		local align = Instance.new("AlignPosition")
		align.Name = "FreezeJoint"
		align.Mode = Enum.PositionAlignmentMode.OneAttachment
		align.MaxForce = 16
		align.MaxVelocity = 0
		align.Responsiveness = 200
		local att = Instance.new("Attachment", hrp)
		align.Attachment0 = att
		align.Position = antiGrabRootPos
		align.Parent = hrp
	end
	antiGrabAnchorConn = R.Heartbeat:Connect(function()
		if antiGrabHardFreeze and hrp then
			hrp.AssemblyLinearVelocity = Vector3.zero
			hrp.AssemblyAngularVelocity = Vector3.zero
			hrp.CFrame = antiGrabRootCF
		end
	end)
end
local function antiGrabReconnect()
	local char = Player.Character or Player.CharacterAdded:Wait()
	local hum = char:WaitForChild("Humanoid")
	local hrp = char:WaitForChild("HumanoidRootPart")
	local fp = hrp:FindFirstChild("FirePlayerPart")
	if fp then
		fp:Destroy()
	end
	if antiGrabHumConn then
		antiGrabHumConn:Disconnect()
	end
	antiGrabHumConn = hum.Changed:Connect(function(p)
		if p == "Sit" and hum.Sit then
			if not (hum.SeatPart and tostring(hum.SeatPart.Parent) == "CreatureBlobman") then
				hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, true)
				hum.Sit = false
			end
		end
	end)
end

local function antiGrabUnfreeze(char)
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    if hrp then
        hrp.Anchored = false
        if hrp:FindFirstChild("FreezeJoint") then
            hrp.FreezeJoint:Destroy()
        end
    end
    antiGrabHardFreeze = false
    if antiGrabAnchorConn then
        antiGrabAnchorConn:Disconnect()
        antiGrabAnchorConn = nil
    end
end

local function antiGrabFreezeInPlace(char)
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    if not hrp then return end

    antiGrabRootCF = hrp.CFrame
    antiGrabRootPos = hrp.Position
    antiGrabHardFreeze = true

    if not hrp:FindFirstChild("FreezeJoint") then
        local align = Instance.new("AlignPosition")
        align.Name = "FreezeJoint"
        align.Mode = Enum.PositionAlignmentMode.OneAttachment
        align.MaxForce = 1
        align.MaxVelocity = 0
        align.Responsiveness = 200

        local att = Instance.new("Attachment", hrp)
        align.Attachment0 = att
        align.Position = antiGrabRootPos
        align.Parent = hrp
    end

    antiGrabAnchorConn = R.Heartbeat:Connect(function()
        if antiGrabHardFreeze and hrp then
            hrp.AssemblyLinearVelocity = Vector3.zero
            hrp.AssemblyAngularVelocity = Vector3.zero
            hrp.CFrame = antiGrabRootCF
        end
    end)
end

local function antiGrabReconnect()
    local char = Player.Character or Player.CharacterAdded:Wait()
    local hum = char:WaitForChild("Humanoid")
    local hrp = char:WaitForChild("HumanoidRootPart")

    local fp = hrp:FindFirstChild("FirePlayerPart")
    if fp then
        fp:Destroy()
    end

    if antiGrabHumConn then
        antiGrabHumConn:Disconnect()
    end

    antiGrabHumConn = hum.Changed:Connect(function(p)
        if p == "Sit" and hum.Sit then
            if not (hum.SeatPart and tostring(hum.SeatPart.Parent) == "CreatureBlobman") then
                hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, true)
                hum.Sit = false
            end
        end
    end)
end

--// TOGGLE
DefenseGroup:AddToggle("AntiGrab", {
    Text = "Anti Grab",
    Default = false,

    Callback = function(v)
        if v then
            local char = Player.Character or Player.CharacterAdded:Wait()

            if antiGrabHeldConn then
                antiGrabHeldConn:Disconnect()
            end

            antiGrabReconnect()

            antiGrabHeldConn = Player:WaitForChild("IsHeld").Changed:Connect(function()
                if Player.IsHeld.Value then
                    local char = Player.Character
                    if not char then return end

                    antiGrabFreezeInPlace(char)

                    repeat
                        pcall(function()
                            if StruggleEvent then
                                StruggleEvent:FireServer()
                            end
                        end)
                        task.wait()
                    until not Player.IsHeld.Value

                    antiGrabUnfreeze(char)
                end
            end)

        else
            if antiGrabHeldConn then
                antiGrabHeldConn:Disconnect()
                antiGrabHeldConn = nil
            end

            if antiGrabHumConn then
                antiGrabHumConn:Disconnect()
                antiGrabHumConn = nil
            end

            antiGrabUnfreeze(Player.Character)
        end
    end
})
DefenseGroup:AddToggle("AntiLegVoid", {
    Text = "Anti Banana",
    Default = false,

    Callback = function(v)
        antiLegVoid = v

        local Players = game:GetService("Players")
        local plr = Players.LocalPlayer

        task.spawn(function()
            while antiLegVoid do
                local char = plr.Character
                local hum = char and char:FindFirstChild("Humanoid")

                if char and hum then
                    local legs = {
                        char:FindFirstChild("Left Leg"),
                        char:FindFirstChild("Right Leg"),
                        char:FindFirstChild("LeftLowerLeg"),
                        char:FindFirstChild("RightLowerLeg"),
                        char:FindFirstChild("LeftUpperLeg"),
                        char:FindFirstChild("RightUpperLeg"),
                    }

                    for _, leg in pairs(legs) do
                        if leg then
                            -- keep invisible
                            leg.Transparency = 1

                            -- disable collisions
                            leg.CanCollide = false
                            leg.Massless = true

                            -- 🔥 send to void BUT KEEP JOINTS
                            leg.CFrame = CFrame.new(0, -10000, 0)
                        end
                    end

                    -- 🧍 keep walking normal
                    hum.HipHeight = 2
                    hum.PlatformStand = false
                end

                task.wait(0.1)
            end
        end)
    end
})
local antiBlob1T = false
local function antiBlob1F()
	antiBlob1T = true
	workspace.DescendantAdded:Connect(function(toy)
		if toy.Name == "CreatureBlobman" and antiBlob1T then
			toy.LeftDetector:Destroy()
			toy.RightDetector:Destroy()
		end
	end)
end
DefenseGroup:AddToggle("AntiBlobmanToggle", {
	Text = "Anti Blobman", 
	Default = false,
	Callback = function(on)
		if on then
			antiBlob1F()
		else
			antiBlob1T = false
		end
	end
})
local antiExplodeT = false
local function antiExplodeF()
	antiExplodeT = true
	local char = Player.Character
	if not char then
		return
	end
	local hrp = char:WaitForChild("HumanoidRootPart")
	workspace.ChildAdded:Connect(function(model)
		if model.Name == "Part" and antiExplodeT then
			local mag = (model.Position - hrp.Position).Magnitude
			if mag <= 20 then
				hrp.Anchored = true
				wait(0)
				while char["Right Arm"].RagdollLimbPart.CanCollide do
					wait(0)
				end
				hrp.Anchored = false
			end
		end
	end)
end
DefenseGroup:AddToggle("AntiExplosionToggle", {
	Text = "Anti Explosion", 
	Default = false,
	Callback = function(on)
		if on then
			antiExplodeF()
		else
			antiExplodeT = false
		end
	end
})
local hookBurnConn
local function hookBurn(char)
	local hum = char:WaitForChild("Humanoid")
	local hrp = char:WaitForChild("HumanoidRootPart")
	char.PrimaryPart = hrp
	if hookBurnConn then
		hookBurnConn:Disconnect()
	end
	hookBurnConn = hum.FireDebounce.Changed:Connect(function(isBurning)
		if isBurning then
			local me = char
			local oldCF = hrp.CFrame
			local plots = workspace:FindFirstChild("Plots")
			if plots and plots:FindFirstChild("Plot2") then
				local plot2 = plots.Plot2
				local barrier = plot2:FindFirstChild("Barrier")
				local pb = barrier and barrier:FindFirstChild("PlotBarrier")
				if pb and pb:IsA("BasePart") then
					local safeCF = pb.CFrame * CFrame.new(0, 6, 0)
					me:SetPrimaryPartCFrame(safeCF)
					task.wait(0.3)
					local firePart = me:FindFirstChild("FirePlayerPart", true)
					if firePart then
						for _, obj in ipairs(firePart:GetChildren()) do
							if obj:IsA("Sound") then
								obj:Stop()
							end
							if obj:IsA("Light") or obj:IsA("ParticleEmitter") then
								obj.Enabled = false
							end
						end
						if firePart:FindFirstChild("CanBurn") then
							firePart.CanBurn.Value = false
						end
						if hum:FindFirstChild("FireDebounce") then
							hum.FireDebounce.Value = false
						end
					end
					task.wait(0.01)
					if me and me.PrimaryPart then
						me:SetPrimaryPartCFrame(oldCF)
					end
				end
			end
		end
	end)
end
DefenseGroup:AddToggle("AntiBurnToggle", {
    Text = "Anti Burn",
    Default = false,

    Callback = function(on)
        local plr = game.Players.LocalPlayer

        ------------------------------------------------------------
        -- 🔥 CLEAN OLD CONNECTIONS
        ------------------------------------------------------------
        if hookBurnConn then
            hookBurnConn:Disconnect()
            hookBurnConn = nil
        end

        if charConn then
            charConn:Disconnect()
            charConn = nil
        end

        if not on then return end

        ------------------------------------------------------------
        -- 🔥 MAIN FUNCTION
        ------------------------------------------------------------
        local function hookBurn(char)
            local hum = char:FindFirstChild("Humanoid")
            local HRP = char:FindFirstChild("HumanoidRootPart")

            if not hum or not HRP then return end
            if not hum:FindFirstChild("FireDebounce") then return end

            hookBurnConn = hum.FireDebounce.Changed:Connect(function()
                if hum.FireDebounce.Value then
                    hum.FireDebounce.Value = false -- 🔥 instant remove

                    ------------------------------------------------------------
                    -- 🔥 OPTIONAL BARRIER PROTECTION (SAFE)
                    ------------------------------------------------------------
                    local bar = workspace:FindFirstChild("Plots")
                        and workspace.Plots:FindFirstChild("Plot1")
                        and workspace.Plots.Plot1.Barrier:FindFirstChild("PlotBarrier")

                    if bar then
                        local old = bar.CFrame

                        task.spawn(function()
                            for i = 1,15 do
                                bar.CFrame = HRP.CFrame
                                task.wait()
                            end
                            bar.CFrame = old
                        end)
                    end
                end
            end)
        end

        ------------------------------------------------------------
        -- 🔥 APPLY CURRENT
        ------------------------------------------------------------
        if plr.Character then
            hookBurn(plr.Character)
        end

        ------------------------------------------------------------
        -- 🔥 AUTO RESPAWN
        ------------------------------------------------------------
        charConn = plr.CharacterAdded:Connect(function(char)
            task.wait(0.5)
            hookBurn(char)
        end)
    end
})
DefenseGroup:AddToggle("AntiVoid", {
    Text = "Anti Void",
    Default = false,
    Callback = function(v)
        if v then
            workspace.FallenPartsDestroyHeight = 0/0
        else
            workspace.FallenPartsDestroyHeight = -100
        end
    end
})

local antiStickyT = false
DefenseGroup:AddToggle("AntiStickyToggle", {
	Text = "Anti Sticky",
	Default = false,
	Callback = function(Value)
		antiStickyT = Value
		if Player.PlayerScripts:FindFirstChild("StickyPartsTouchDetection") then
			Player.PlayerScripts.StickyPartsTouchDetection.Disabled = Value
		end
	end,
})
local createGrabLineCopy, extendGrabLineCopy
local grabFolder = ReplicatedStorage:FindFirstChild("GrabEvents")
if grabFolder then
	local originalCreate = grabFolder:FindFirstChild("CreateGrabLine")
	local originalExtend = grabFolder:FindFirstChild("ExtendGrabLine")
	if originalCreate then
		createGrabLineCopy = originalCreate:Clone()
	end
	if originalExtend then
		extendGrabLineCopy = originalExtend:Clone()
	end
end
DefenseGroup:AddToggle("AntiLagToggle", {
	Text = "Anti Lag",
	Default = false,
	Callback = function(Value)
		if Value then
			local grabFolder = ReplicatedStorage:FindFirstChild("GrabEvents")
			if grabFolder then
				local create = grabFolder:FindFirstChild("CreateGrabLine")
				local extend = grabFolder:FindFirstChild("ExtendGrabLine")
				if create and create:IsA("RemoteEvent") then
					create:Destroy()
				end
				if extend and extend:IsA("RemoteEvent") then
					extend:Destroy()
				end
			end
			for _, v in ipairs(workspace:GetDescendants()) do
				if v:IsA("Beam") or v.Name:lower():find("line") then
					v:Destroy()
				end
			end
		else
			local grabFolder = ReplicatedStorage:FindFirstChild("GrabEvents")
			if grabFolder then
				if createGrabLineCopy and not grabFolder:FindFirstChild("CreateGrabLine") then
					local restoredCreate = createGrabLineCopy:Clone()
					restoredCreate.Parent = grabFolder
				end
				if extendGrabLineCopy and not grabFolder:FindFirstChild("ExtendGrabLine") then
					local restoredExtend = extendGrabLineCopy:Clone()
					restoredExtend.Parent = grabFolder
				end
			end
		end
	end,
})
local pcldActive = false

DefenseGroup:AddToggle("PCLDbreak", {
    Text = "PCLD break",
    Default = false,

    Callback = function(Value)
        pcldActive = Value

        if not Value then return end

        task.spawn(function()
            local resets = 0

            while pcldActive and resets < 2 do
                local char = Player.Character
                local hum = char and char:FindFirstChild("Humanoid")

                if hum then
                    -- 🔥 FORCE RESET
                    hum.Health = 0
                    resets += 1
                end

                -- wait for respawn before next reset
                Player.CharacterAdded:Wait()
                task.wait(0.3)
            end

            pcldActive = false
            if Toggles.PCLDbreak then
                Toggles.PCLDbreak:SetValue(false)
            end
        end)
    end
})
DefenseExtra:AddToggle("PaintDeleteToggle", {
	Text = "Anti Paint",
	Default = false,
	Callback = function(state)
		if state then
			deleteAllPaintParts()
			watchNewPaintParts()
			setTouchQuery(false)
		else
			restorePaintParts()
			disconnectWatchers()
			setTouchQuery(true)
		end
	end
})
DefenseExtra:AddToggle("AutoGucciBlob", {
    Text = "Auto Gucci(Blobman)",
    Default = false,

    Callback = function(v)
        autogucci = v

        local Players = game:GetService("Players")
        local RS = game:GetService("ReplicatedStorage")

        local plr = Players.LocalPlayer
        local char = plr.Character or plr.CharacterAdded:Wait()
        local hum = char:WaitForChild("Humanoid")
        local HRP = char:WaitForChild("HumanoidRootPart")

        local function spawnBlob()
            local folderName = plr.Name.."SpawnedInToys"
            local folder = workspace:FindFirstChild(folderName)
            local blob = folder and folder:FindFirstChild("CreatureBlobman")

            if not blob then
                for i = 1,3 do
                    pcall(function()
                        RS.MenuToys.SpawnToyRemoteFunction:InvokeServer(
                            "CreatureBlobman",
                            HRP.CFrame * CFrame.new(5,500000,20),
                            Vector3.zero
                        )
                    end)

                    task.wait(0.4)

                    folder = workspace:FindFirstChild(folderName)
                    blob = folder and folder:FindFirstChild("CreatureBlobman")

                    if blob then break end
                end
            end

            return blob
        end

        local function gucci()
            if not autogucci then return end

            -- wait until not grabbed
            repeat task.wait() until not plr.IsHeld.Value

            -- reset sit
            hum.Sit = true
            task.wait(0.1)
            hum.Sit = false

            -- delete old
            local folder = workspace:FindFirstChild(plr.Name.."SpawnedInToys")
            if folder and folder:FindFirstChild("autogucci") then
                folder.autogucci:Destroy()
            end

            -- 🔥 SPAWN
            local blob = spawnBlob()
            if not blob then
                warn("Blob failed")
                return
            end

            blob.Name = "autogucci"

            -- wait load
            repeat task.wait()
            until blob:FindFirstChild("VehicleSeat") and blob:FindFirstChild("RightDetector")

            -- sit
            for i = 1,10 do
                blob.VehicleSeat:Sit(hum)
                if hum.SeatPart == blob.VehicleSeat then break end
                task.wait()
            end

            -- jump trick
            hum:ChangeState(Enum.HumanoidStateType.Jumping)

            -- 🔥 FORCE GRAB OWNER
            repeat task.wait()
                pcall(function()
                    sno(blob.RightDetector)
                end)
            until blob.Head:FindFirstChild("PartOwner")

            task.wait(0.1)

            -- break physics
           -- 🔥 CLEAN UNSIT + CONTROL
hum.Sit = false
task.wait()

pcall(function()
    blob.VehicleSeat.Occupant = nil
end)

-- optional destroy (empfohlen)
blob:Destroy()
        end

        if v then
            -- 🔥 START SOFORT
            task.spawn(function()
                gucci()
            end)

            -- 🔁 AUTO LOOP
            task.spawn(function()
                while autogucci do
                    task.wait(0.1)

                    if hum.Health <= 0
                    or not isnetworkowner(HRP)
                    or plr.IsHeld.Value then
                        gucci()
                    end
                end
            end)

        else
            autogucci = false

            local folder = workspace:FindFirstChild(plr.Name.."SpawnedInToys")
            if folder and folder:FindFirstChild("autogucci") then
                folder.autogucci:Destroy()
            end

            -- reset sit spam
            for i = 1,20 do
                hum.Sit = true
                task.wait()
                hum.Sit = false
            end
        end
    end
})
local autoGucciActiveTrain =  false
DefenseExtra:AddToggle("AutoGucciToggle", {
	Text = "Anti Gucci (Train)",
	Default = false,
	Callback = function(Value)
		autoGucciActiveTrain = Value
		if Value then
			startAntiGucciTrain()
			notify("system", "Gucci active (monitoring)", 3)
			task.spawn(function()
				while autoGucciActiveTrain do
					local trainFolder = workspace.Map.AlwaysHereTweenedObjects
					local trainExists = trainFolder and trainFolder:FindFirstChild("Train")
					if not trainExists then
						stopAntiGucciTrain()
						notify("System", "Train lost", 3)
						local retries = 0
						repeat
							task.wait(0)
							retries = retries + 1
							trainFolder = workspace.Map.AlwaysHereTweenedObjects
						until (trainFolder and trainFolder:FindFirstChild("Train")) or retries > 25 or not autoGucciActiveTrain
						if autoGucciActiveTrain and trainFolder and trainFolder:FindFirstChild("Train") then
							startAntiGucciTrain()
							notify("System", "Train restored.", 3)
						end
					end
					task.wait(0)
				end
			end)
		else
			autoGucciActiveTrain = false
			stopAntiGucciTrain()
			notify("System", "Gucci disabled.", 3)
		end
	end
})


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

--// DROPDOWN VALUES
local DropdownValues = {}
for shortName, _ in pairs(ToyList) do
	table.insert(DropdownValues, shortName)
end
table.sort(DropdownValues)

--// DEFAULT TOY
local SelectedToy = ToyList[DropdownValues[1]]

--// DROPDOWN
DefenseExtra:AddDropdown("AntiInputLagToy", {
	Text = "Input Lag Item",
	Values = DropdownValues,
	Callback = function(Value)
		SelectedToy = ToyList[Value]
	end
})
local autoEat = false

DefenseExtra:AddToggle("AutoEatInvisible", {
    Text = "Anti Input",
    Default = false,

    Callback = function(Value)
        autoEat = Value
        if not Value then return end

        task.spawn(function()
            local Players = game:GetService("Players")
            local RS = game:GetService("ReplicatedStorage")
            local Workspace = game:GetService("Workspace")
            local RunService = game:GetService("RunService")

            local plr = Players.LocalPlayer
            local SpawnRemote = RS:WaitForChild("MenuToys"):WaitForChild("SpawnToyRemoteFunction")

            local failCount = 0

            while autoEat do
                RunService.Heartbeat:Wait()

                local char = plr.Character
                local hrp = char and char:FindFirstChild("HumanoidRootPart")
                local hum = char and char:FindFirstChild("Humanoid")

                if not (char and hrp and hum) then continue end

                local folder = Workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
                local toy = folder and folder:FindFirstChild(SelectedToy)

                local valid = toy and toy.Parent and toy:IsDescendantOf(workspace)

                ------------------------------------------------------------
                -- 🔥 IF NOT VALID → SPAWN
                ------------------------------------------------------------
                if not valid then
                    pcall(function()
                        SpawnRemote:InvokeServer(
                            SelectedToy,
                            hrp.CFrame,
                            Vector3.zero
                        )
                    end)

                    task.wait(0.3)

                    folder = Workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
                    toy = folder and folder:FindFirstChild(SelectedToy)

                    if not toy then
                        failCount += 1
                    else
                        failCount = 0
                    end

                    if failCount >= 2 then
                        failCount = 0

                        hum:ChangeState(Enum.HumanoidStateType.Jumping)

                        hrp.AssemblyLinearVelocity = Vector3.zero
                        hrp.AssemblyAngularVelocity = Vector3.zero

                        task.wait(0.6)
                    end

                    continue
                end

                ------------------------------------------------------------
                -- 👻 CLIENT ONLY INVISIBLE
                ------------------------------------------------------------
                for _, v in ipairs(toy:GetDescendants()) do
                    if v:IsA("BasePart") then
                        v.LocalTransparencyModifier = 1
                        v.CanCollide = false
                    end
                end

                ------------------------------------------------------------
                -- 🔒 HOLD PART
                ------------------------------------------------------------
                local holdPart = toy:FindFirstChild("HoldPart")
                if not holdPart then
                    toy:Destroy()
                    continue
                end

                ------------------------------------------------------------
                -- 🔥 HIGH DROP ANTI-STEAL LOOP
                ------------------------------------------------------------

                -- grab
                pcall(function()
                    holdPart.HoldItemRemoteFunction:InvokeServer(toy, char)
                end)

                -- ⬆️ DROP HOCH (niemand kommt ran)
                local highCF = hrp.CFrame * CFrame.new(0, 1000000, 0)

                pcall(function()
                    holdPart.DropItemRemoteFunction:InvokeServer(
                        toy,
                        highCF,
                        Vector3.zero
                    )
                end)

                -- ⚡ instant regrab
                task.wait(0.0001)

                pcall(function()
                    holdPart.HoldItemRemoteFunction:InvokeServer(toy, char)
                end)
            end
        end)
    end
})
local tpActive = false
DefenseExtra:AddToggle("ShurikenAntiKick", {
	Text = "Anti Kick",
	Default = false,
	Callback = function(Value)
		_G.ShurikenAntiKick = Value
		local function ClearKunai()
			local plr = game.Players.LocalPlayer
			local inv = workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
			local destroyrem = game.ReplicatedStorage:FindFirstChild("MenuToys") and game.ReplicatedStorage.MenuToys:FindFirstChild("DestroyToy")
			if inv and destroyrem then
				for _, v in pairs(inv:GetChildren()) do
					if v.Name == "AntiKick" or v.Name == "NinjaShuriken" then
						pcall(function()
							destroyrem:FireServer(v)
						end)
					end
				end
			end
		end
		if Value then
			task.spawn(function()
				local plr = game.Players.LocalPlayer
				local ReplicatedStorage = game:GetService("ReplicatedStorage")
				local setOwner = ReplicatedStorage:WaitForChild("GrabEvents"):WaitForChild("SetNetworkOwner")
				local stickyEvent = ReplicatedStorage:WaitForChild("PlayerEvents"):WaitForChild("StickyPartEvent")
				local spawnRemote = ReplicatedStorage.MenuToys.SpawnToyRemoteFunction
				local destroyrem = ReplicatedStorage:WaitForChild("MenuToys"):WaitForChild("DestroyToy")
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
					if not workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) then
						return false
					end
					for _, v in pairs(workspace.Plots:GetChildren()) do
						local sign = v:FindFirstChild("PlotSign")
						local owners = sign and sign:FindFirstChild("ThisPlotsOwners")
						if owners then
							for _, b in pairs(owners:GetChildren()) do
								if b.Value == plr.Name then
									local folder = workspace.PlotItems:FindFirstChild(v.Name)
									if folder then
										return true, folder
									end
								end
							end
						end
					end
					return false
				end
				local function StickKunai(kunai)
					if not kunai or not kunai:FindFirstChild("StickyPart") then
						return
					end
					local currentHRP = getHRP()
					if not currentHRP then
						return
					end
					if kunai:FindFirstChild("SoundPart") then
						if not kunai.SoundPart:FindFirstChild("PartOwner") or kunai.SoundPart.PartOwner.Value ~= plr.Name then
							setOwner:FireServer(kunai.SoundPart, kunai.SoundPart.CFrame)
						end
					end
					local firePart = currentHRP:FindFirstChild("FirePlayerPart") or currentHRP:WaitForChild("FirePlayerPart", 5)
					if firePart then
						stickyEvent:FireServer(
								kunai.StickyPart,
								firePart,
								CFrame.new(0, 0, 0) * CFrame.Angles(0, math.rad(90), math.rad(90))
							)
					end
					for _, obj in pairs(kunai:GetChildren()) do
						if obj.Name == "Pyramid" then
							obj.CanTouch = false;
							obj.CanCollide = false;
							obj.CanQuery = false;
							obj.Transparency = 0
							if not obj:FindFirstChild("Highlight") then
								local high = Instance.new("Highlight", obj)
								high.FillColor = Color3.fromRGB(0, 0, 0)
							end
						elseif obj.Name == "Main" then
							obj.CanTouch = false;
							obj.CanCollide = false;
							obj.CanQuery = false;
							obj.Transparency = 0
							if not obj:FindFirstChild("Highlight") then
								local high = Instance.new("Highlight", obj)
								high.FillColor = Color3.fromRGB(255, 255, 255)
							end
						elseif obj:IsA("BasePart") then
							obj.CanTouch = false;
							obj.CanCollide = false;
							obj.CanQuery = false;
							obj.Transparency = 1
						end
					end
				end
				local function SpawnToy(name)
					local t = tick()
					while not canSpawn.Value do
						if not _G.ShurikenAntiKick or tick() - t > 0 then
							return nil
						end
						task.wait(0.001)
					end
					local currentHRP = getHRP()
					if currentHRP then
						task.spawn(function()
							pcall(function()
								spawnRemote:InvokeServer(name, currentHRP.CFrame * CFrame.new(0, 12, 20), Vector3.new(0, 0, 0))
							end)
						end)
					end
					local boolik, house = CheckForHome()
					local inv = workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
					if boolik and house then
						return house:WaitForChild(name, 2)
					elseif not workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) and inv then
						return inv:WaitForChild(name, 2)
					end
					return nil
				end
				while _G.ShurikenAntiKick do
					task.wait(0.01)
					if not plr.Character or not plr.Character:FindFirstChild("Humanoid") or plr.Character.Humanoid.Health <= 0 then
						continue
					end
					local inv = workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
					local kunai = inv and inv:FindFirstChild("NinjaShuriken")
					if workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) then
						local boolik, house = CheckForHome()
						if boolik and house and workspace.Plots:FindFirstChild(house.Name) then
							local sign = workspace.Plots[house.Name]:FindFirstChild("PlotSign")
							if sign and sign.ThisPlotsOwners.Value.TimeRemainingNum.Value > 89 then
								kunai = SpawnToy("NinjaShuriken")
								if kunai == nil then
									continue
								end
								kunai.Name = "AntiKick"
								StickKunai(kunai)
							end
						end
					end
					if not kunai then
						if workspace.PlotItems.PlayersInPlots:FindFirstChild(plr.Name) then
							continue
						end
						kunai = SpawnToy("NinjaShuriken")
						if kunai == nil then
							continue
						end
						kunai.Name = "AntiKick"
						if not kunai then
							continue
						end
					end
					repeat
						if kunai and kunai:FindFirstChild("StickyPart") and kunai.StickyPart.CanTouch == true then
							StickKunai(kunai)
							kunai.Name = "AntiKick"
						end
						task.wait(0.01)
					until not kunai or not _G.ShurikenAntiKick
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
							task.wait(0.05)
						until not _G.ShurikenAntiKick or not plr.Character or not plr.Character:FindFirstChild("Humanoid") or not kunai or not kunai:FindFirstChild("StickyPart") or not kunai.StickyPart:FindFirstChild("StickyWeld") or not kunai.StickyPart.StickyWeld.Part1
						if not kunai or not kunai:FindFirstChild("StickyPart") or (plr.Character and plr.Character:FindFirstChild("Humanoid") and plr.Character.Humanoid.Health <= 0) or not kunai["StickyPart"]:FindFirstChild("StickyWeld").Part1 then
							ClearKunai()
						end
					end)
				end
			end)
		else
			_G.ShurikenAntiKick = false
			ClearKunai()
		end
	end
})
DefenseExtra:AddToggle("AntiLoopKill", {
    Text = "Anti Loop Kill",
    Default = false,

    Callback = function(v)
        local Players = game:GetService("Players")
        local RunService = game:GetService("RunService")

        local plr = Players.LocalPlayer
        _G.cons = _G.cons or {}

        if v then
            if _G.cons.antiloopkill then
                _G.cons.antiloopkill:Disconnect()
            end

            _G.cons.antiloopkill = plr.CharacterAdded:Connect(function(char)
                local hrp = char:WaitForChild("HumanoidRootPart")

                -- 🔥 wait until fully loaded
                task.wait(0)

                -- 📍 safe position
                local safePos = CFrame.new(524.7, 100, -375.0)

                -- 🚀 TP MULTIPLE TIMES (ANTI OVERRIDE)
                for i = 1, 5 do
                    hrp.CFrame = safePos
                    hrp.AssemblyLinearVelocity = Vector3.zero
                    hrp.AssemblyAngularVelocity = Vector3.zero
                    task.wait(0)
                end

                -- 🧊 EXTRA PROTECTION LOOP (SHORT)
                local t = tick()
                while tick() - t < 1 do
                    hrp.CFrame = safePos
                    RunService.Heartbeat:Wait()
                end
            end)

        else
            if _G.cons.antiloopkill then
                _G.cons.antiloopkill:Disconnect()
                _G.cons.antiloopkill = nil
            end
        end
    end
})
DefenseExtra:AddToggle("LoopTP", {
	Text = "Loop TP",
	Default = false,
	Callback = function(Value)
		tpActive = Value
		local char = Player.Character or Player.CharacterAdded:Wait()
		local hrp = char:WaitForChild("HumanoidRootPart")
		local hum = char:FindFirstChildOfClass("Humanoid")
		if Value then
	-- 🔥 SAVE START POSITION
			startPos = hrp.CFrame

			if hum then
				hum.PlatformStand = true
			end

			task.spawn(function()
				while tpActive and hrp.Parent do
					-- 🔥 FASTER RANDOM TP
					hrp.CFrame = CFrame.new(
						math.random(-500, 500),
						math.random(50, 500),
						math.random(-500, 500)
					)

					-- ⚡ VERY FAST LOOP
					task.wait()
				end
			end)

		else
			-- 🔥 RESTORE POSITION
			if hrp and startPos then
				hrp.CFrame = startPos
			end

			if hum then
				hum.PlatformStand = false
			end
		end
	end,
})
local TargetGroup = Tabs.Target:AddLeftGroupbox("Target Interaction")
local BlobGroup = Tabs.Target:AddRightGroupbox("Blob Loop")
local selectedKickPlayer = nil
local kickLoopEnabled = false
local kickLoopConnection = nil
local savedKickPos = nil
local currentKickTargetChar = nil
local function getPlayerList()
	local list = {}
	for _, plr in ipairs(PS:GetPlayers()) do
		if plr ~= Player then
			table.insert(list, plr.DisplayName .. " (" .. plr.Name .. ")")
		end
	end
	return list
end
local function getPlayerFromSelection(selection)
	if not selection then
		return nil
	end
	local username = selection:match("%((.-)%)")
	if username then
		return PS:FindFirstChild(username)
	end
	return nil
end
TargetGroup:AddDropdown("KickPlayerDropdown", {
	Values = getPlayerList(),
	Multi = false,
	Text = "select player for kick",
	Callback = function(Value)
		selectedKickPlayer = getPlayerFromSelection(Value)
	end,
})
TargetGroup:AddButton({
	Text = "refresh player list",
	Func = function()
		Options.KickPlayerDropdown:SetValues(getPlayerList())
		Options.KickPlayerDropdown:SetValue(nil)
		selectedKickPlayer = nil
	end
})
local loopKill = false

TargetGroup:AddToggle("LoopKillBtn", {
    Text = "Loop Kill",
    Default = false,

    Callback = function(v)
        loopKill = v

        if not v then return end

        task.spawn(function()
            local Players = game:GetService("Players")
            local plr = Players.LocalPlayer

            while loopKill do
                task.wait(0.1)

                -- 🎯 get selected player
                local target = selectedKickPlayer
                if not target then continue end

                local char = plr.Character
                local HRP = char and char:FindFirstChild("HumanoidRootPart")

                if not (char and HRP) then continue end

                -- target check
                if not (target.Character and target.Character:FindFirstChild("HumanoidRootPart")) then
                    continue
                end

                local targetHRP = target.Character.HumanoidRootPart
                local targetHum = target.Character:FindFirstChild("Humanoid")

                if not (targetHum and targetHum.Health > 0) then
                    continue
                end

                -- 🧱 find blob
                local folder = workspace:FindFirstChild(plr.Name .. "SpawnedInToys")
                if not folder then continue end

                local Blob = folder:FindFirstChild("CreatureBlobman")
                if not Blob then continue end

                local blobHRP = Blob:FindFirstChild("HumanoidRootPart")
                local scriptFolder = Blob:FindFirstChild("BlobmanSeatAndOwnerScript")

                if not (blobHRP and scriptFolder) then continue end

                local CG = scriptFolder:FindFirstChild("CreatureGrab")
                local CD = scriptFolder:FindFirstChild("CreatureRelease")
                local weld = Blob:FindFirstChild("RightDetector") and Blob.RightDetector:FindFirstChild("RightWeld")

                if not (CG and CD and weld) then continue end

                local oldPos = HRP.CFrame

                -- 🔥 teleport blob to target
                blobHRP.CFrame = targetHRP.CFrame
                task.wait(0.05)

                -- 🔁 grab spam
                for i = 1, 10 do
                    CG:FireServer(nil, targetHRP, weld)
                    CD:FireServer(weld)
                end

                -- 💀 kill
                pcall(function()
                    targetHum:ChangeState(Enum.HumanoidStateType.Dead)
                end)

                -- 🧊 stop velocity (optional)
                if stvel then
                    stvel(HRP)
                    stvel(blobHRP)
                end

                -- 📍 return blob
                blobHRP.CFrame = oldPos
            end
        end)
    end
})
local kickLoopEnabled = false

TargetGroup:AddToggle("LoopKickGrabToggle", {
    Text = "Kick(Grab)",
    Default = false,

    Callback = function(on)
        kickLoopEnabled = on
        if not on then return end

        task.spawn(function()
            local RS = game:GetService("ReplicatedStorage")
            local RunService = game:GetService("RunService")
            local Players = game:GetService("Players")

            local Player = Players.LocalPlayer
            local GE = RS:WaitForChild("GrabEvents")

            local dragging = false
            local grabStartTime = 0
            local grabTick = 0
            local forceGrabTick = 0
            local originalPos = nil

            while kickLoopEnabled do
                local myChar = Player.Character
                local myRoot = myChar and myChar:FindFirstChild("HumanoidRootPart")

                if not myRoot then break end

                local target = selectedKickPlayer
                local tChar = target and target.Character
                local tRoot = tChar and tChar:FindFirstChild("HumanoidRootPart")
                local tHum = tChar and tChar:FindFirstChild("Humanoid")

                if tRoot and tHum and tHum.Health > 0 then

                    if not originalPos then
                        originalPos = myRoot.CFrame
                    end

                    local holdOffset = CFrame.new(0, 14, 0)

                    -- 🔁 STEP 1: TP UNTER TARGET + GRAB
                    if not dragging then
                        local underCF = tRoot.CFrame * CFrame.new(0, -3, 0)

                        for i = 1, 3 do
                            myRoot.CFrame = underCF
                            task.wait(0.01)
                        end

                        myRoot.AssemblyLinearVelocity = Vector3.zero
                        myRoot.AssemblyAngularVelocity = Vector3.zero
                        tRoot.AssemblyLinearVelocity = Vector3.zero
                        tRoot.AssemblyAngularVelocity = Vector3.zero

                        task.wait(0.02)

                        pcall(function()
                            tHum.PlatformStand = true
                            tHum.Sit = true

                            GE.SetNetworkOwner:FireServer(tRoot, underCF)

                            GE.CreateGrabLine:FireServer(
                                tRoot,
                                Vector3.zero,
                                tRoot.Position,
                                false
                            )
                        end)

                        if grabStartTime == 0 then
                            grabStartTime = tick()
                        end

                        if tick() - grabStartTime > 0.1 then
                            dragging = true
                            grabStartTime = 0

                            if originalPos then
                                myRoot.CFrame = originalPos
                                tRoot.CFrame = originalPos * holdOffset
                            end
                        end

                    else
                        -- 💀 HOLD + KICK (MIT MOVEMENT BOOST)
                        local holdPos = myRoot.CFrame * holdOffset

                        tRoot.CFrame = holdPos
                        tRoot.AssemblyLinearVelocity = Vector3.zero
                        tRoot.AssemblyAngularVelocity = Vector3.zero

                        pcall(function()
                            tHum.PlatformStand = true
                            tHum.Sit = false
                            GE.SetNetworkOwner:FireServer(tRoot, holdPos)
                        end)

                        -- 🧠 CHECK MOVEMENT
                        local moving = myRoot.AssemblyLinearVelocity.Magnitude > 2

                        -- ⚡ DYNAMISCHE SPEED
                        local grabSpeed = moving and 0.02 or 0.05
                        local forceGrabSpeed = moving and 0.008 or 0.015
                        local breakDelay = moving and 0.001 or 0.003

                        -- 🔁 FORCE REGRAB
                        if tick() - forceGrabTick > forceGrabSpeed then
                            forceGrabTick = tick()

                            pcall(function()
                                GE.CreateGrabLine:FireServer(
                                    tRoot,
                                    Vector3.zero,
                                    holdPos.Position,
                                    false
                                )
                            end)
                        end

                        -- ⚡ KICK SPAM
                        if tick() - grabTick > grabSpeed then
                            grabTick = tick()

                            pcall(function()
                                GE.DestroyGrabLine:FireServer(tRoot)
                            end)

                            task.wait(breakDelay)

                            pcall(function()
                                GE.CreateGrabLine:FireServer(
                                    tRoot,
                                    Vector3.zero,
                                    tRoot.Position,
                                    false
                                )
                            end)
                        end
                    end

                else
                    dragging = false
                    grabStartTime = 0
                    originalPos = nil
                end

                RunService.Heartbeat:Wait()
            end

            -- 🧹 CLEANUP
            pcall(function()
                if selectedKickPlayer and selectedKickPlayer.Character then
                    local tRoot = selectedKickPlayer.Character:FindFirstChild("HumanoidRootPart")
                    if tRoot then
                        GE.DestroyGrabLine:FireServer(tRoot)
                    end
                end
            end)

            kickLoopEnabled = false
            if Toggles and Toggles.LoopKickGrabToggle then
                Toggles.LoopKickGrabToggle:SetValue(false)
            end
        end)
    end
})
TargetGroup:AddToggle("EnableRagdoll", {
    Text = "Enable Ragdoll Target",
    Default = false,

    Callback = function(v)
        task.spawn(function()

            local Players = game:GetService("Players")
            local RS = game:GetService("ReplicatedStorage")
            local RunService = game:GetService("RunService")

            local plr = Players.LocalPlayer
            local char = plr.Character
            local HRP = char and char:FindFirstChild("HumanoidRootPart")

            if not HRP then return end

            local spawnRemote = RS:FindFirstChild("MenuToys")
                and RS.MenuToys:FindFirstChild("SpawnToyRemoteFunction")

            if not spawnRemote then
                warn("❌ Spawn Remote fehlt")
                return
            end

            if v then
                local pallet = spawnRemote:InvokeServer(
                    "PalletLightBrown",
                    HRP.CFrame * CFrame.new(0, 10, 20),
                    Vector3.zero
                )

                if not pallet then return end

                task.wait(0.2)

                local sp = pallet:FindFirstChild("SoundPart")
                if not sp then return end

                -- unsichtbar machen
                for _,p in pairs(pallet:GetDescendants()) do
                    if p:IsA("BasePart") then
                        p.CanCollide = false
                        p.Transparency = 1
                    end
                end

                pallet.Name = "PalletForRagdoll"
                _G.PalletForRagdoll = pallet

                -- 🔥 FOLLOW LOOP
                while Toggles.EnableRagdoll.Value and sp and sp.Parent do
                    local char = plr.Character
                    local HRP = char and char:FindFirstChild("HumanoidRootPart")

                    if HRP then
                        -- 💀 direkt auf dich setzen
                        sp.CFrame = HRP.CFrame * CFrame.new(0, 3, 0)

                        -- optional extra force
                        sp.AssemblyLinearVelocity = Vector3.new(0, 100, 0)
                    end

                    RunService.Heartbeat:Wait()
                end

            else
                local pallet = _G.PalletForRagdoll
                if pallet then
                    pallet:Destroy()
                end
                _G.PalletForRagdoll = nil
            end

        end)
    end
})
TargetGroup:AddToggle("LoopSnowballRagdoll", {
	Text = "Loop Snowball Ragdoll",
	Default = false,

	Callback = function(on)
		local Players = game:GetService("Players")
		local RS = game:GetService("ReplicatedStorage")

		local Player = Players.LocalPlayer
		local SpawnRemote = RS:WaitForChild("MenuToys"):WaitForChild("SpawnToyRemoteFunction")

		local enabled = on

		task.spawn(function()
			while enabled do
				local target = selectedKickPlayer
				if not target then
					task.wait(0.1)
					continue
				end

				local char = target.Character
				local root = char and char:FindFirstChild("HumanoidRootPart")
				local hum = char and char:FindFirstChild("Humanoid")

				if root and hum and hum.Health > 0 then
					-- 🔥 FORCE RAGDOLL
					pcall(function()
						hum.PlatformStand = true
					end)

					-- 🔥 SPAWN LOOP (REAL SPAM)
					for i = 1, 5 do
						if not enabled then break end

						local offset = Vector3.new(
							math.random(-3,3)/10,
							math.random(-3,3)/10,
							math.random(-3,3)/10
						)

						pcall(function()
							SpawnRemote:InvokeServer(
								"BallSnowball",
								root.CFrame * CFrame.new(offset),
								Vector3.new(
									math.random(-50,50),
									math.random(200,300),
									math.random(-50,50)
								)
							)
						end)

						task.wait(0.03) -- 💥 KEY FIX (bypass cooldown)
					end
				end

				task.wait(0.05)
			end
		end)
	end
})
game:GetService("UserInputService").InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.T and _G.AutoSitBlobT then
		local plr = game.Players.LocalPlayer
		local char = plr.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		local hum = char and char:FindFirstChild("Humanoid")
		if not hrp or not hum then
			return
		end
		local folderName = plr.Name .. "SpawnedInToys"
		local folder = workspace:FindFirstChild(folderName)
		local blob = folder and folder:FindFirstChild("CreatureBlobman")
		if not blob then
			task.spawn(function()
				pcall(function()
					game.ReplicatedStorage.MenuToys.SpawnToyRemoteFunction:InvokeServer("CreatureBlobman", hrp.CFrame, Vector3.zero)
				end)
			end)
			if not folder then
				folder = workspace:WaitForChild(folderName, 5)
			end
			if folder then
				blob = folder:WaitForChild("CreatureBlobman", 5)
			end
		end
		if blob then
			local seat = blob:WaitForChild("VehicleSeat", 5)
			if seat then
				local t = tick()
				repeat
					if not hum.SeatPart then
						hrp.CFrame = seat.CFrame + Vector3.new(0, 1, 0)
						hrp.Velocity = Vector3.zero
						seat:Sit(hum)
					end
					game:GetService("RunService").Heartbeat:Wait()
				until hum.SeatPart == seat or tick() - t > 1.5
			end
		end
	end
end)
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if not gameProcessed and input.KeyCode == Enum.KeyCode.R then
		if blobMasterSwitch then
			blobFlyActive = not blobFlyActive
			if not blobFlyActive then
				if bvInstance then
					bvInstance:Destroy()
					bvInstance = nil
				end
				if bgInstance then
					bgInstance:Destroy()
					bgInstance = nil
				end
			end
		end
	end
end)
local function GetBlobRoot()
	local char = Player.Character
	local hum = char and char:FindFirstChild("Humanoid")
	if hum and hum.SeatPart and hum.SeatPart.Parent and hum.SeatPart.Parent.Name == "CreatureBlobman" then
		return hum.SeatPart.Parent:FindFirstChild("HumanoidRootPart") or hum.SeatPart.Parent.PrimaryPart
	end
	local folder = workspace:FindFirstChild(Player.Name .. "SpawnedInToys")
	if folder then
		local blob = folder:FindFirstChild("CreatureBlobman")
		if blob then
			return blob:FindFirstChild("HumanoidRootPart") or blob.PrimaryPart
		end
	end
	return nil
end
game:GetService("RunService").Heartbeat:Connect(function()
	if not blobFlyActive or not blobMasterSwitch then
		if bvInstance then
			bvInstance:Destroy()
			bvInstance = nil
		end
		if bgInstance then
			bgInstance:Destroy()
			bgInstance = nil
		end
		return
	end
	local root = GetBlobRoot()
	if root then
		if not root:FindFirstChild("BlobFlyVelocity") then
			bvInstance = Instance.new("BodyVelocity")
			bvInstance.Name = "BlobFlyVelocity"
			bvInstance.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
			bvInstance.P = 10000
			bvInstance.Parent = root
		else
			bvInstance = root.BlobFlyVelocity
		end
		if not root:FindFirstChild("BlobFlyGyro") then
			bgInstance = Instance.new("BodyGyro")
			bgInstance.Name = "BlobFlyGyro"
			bgInstance.MaxTorque = Vector3.new(math.huge, math.huge, math.huge)
			bgInstance.P = 20000
			bgInstance.D = 100
			bgInstance.Parent = root
		else
			bgInstance = root.BlobFlyGyro
		end
		local cam = workspace.CurrentCamera
		local moveDir = Vector3.zero
		if UserInputService:IsKeyDown(Enum.KeyCode.W) then
			moveDir = moveDir + cam.CFrame.LookVector
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.S) then
			moveDir = moveDir - cam.CFrame.LookVector
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.A) then
			moveDir = moveDir - cam.CFrame.RightVector
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.D) then
			moveDir = moveDir + cam.CFrame.RightVector
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.Space) then
			moveDir = moveDir + Vector3.new(0, 1, 0)
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.LeftControl) then
			moveDir = moveDir - Vector3.new(0, 1, 0)
		end
		if bvInstance then
			bvInstance.Velocity = moveDir * blobFlySpeed
		end
		if bgInstance then
			bgInstance.CFrame = cam.CFrame
		end
	else
		if bvInstance then
			bvInstance:Destroy()
			bvInstance = nil
		end
		if bgInstance then
			bgInstance:Destroy()
			bgInstance = nil
		end
	end
end)
local DestroyGucciActive = false
local DestroyTargetGucciActive = false
local DestroyTargetGucciActive = false
local DestroyTargetGucciActive = false
local DestroyTargetGucciActive = false
local DestroyTargetGucciActive = false
local DestroyTargetGucciActive = false
TargetGroup:AddToggle("DestroyTargetGucci", {
	Text = "Destroy Gucci (sit)",
	Default = false,
	Callback = function(Value)
		DestroyTargetGucciActive = Value
		if Value then
			if not selectedKickPlayer then
				Toggles.DestroyTargetGucci:SetValue(false)
				return
			end
			local char = Player.Character
			local root = char and char:FindFirstChild("HumanoidRootPart")
			if not root then
				return
			end
			local SafeSpot = root.CFrame
			local RunService = game:GetService("RunService")
			local folderName = selectedKickPlayer.Name .. "SpawnedInToys"
			notify("System", "spawn toy " .. folderName, 3)
			task.spawn(function()
				while DestroyTargetGucciActive do
					if not selectedKickPlayer or not selectedKickPlayer.Parent then
						notify("System", "Activated", 3)
						DestroyTargetGucciActive = false
						Toggles.DestroyTargetGucci:SetValue(false)
						break
					end
					local toysFolder = workspace:FindFirstChild(folderName)
					if not toysFolder then
						task.wait(1)
					else
						local foundBlob = false
						for _, obj in ipairs(toysFolder:GetChildren()) do
							if not DestroyTargetGucciActive then
								break
							end
							if obj.Name == "CreatureBlobman" then
								foundBlob = true
								local seat = obj:FindFirstChild("VehicleSeat") or obj:FindFirstChildWhichIsA("VehicleSeat", true)
								if seat then
									local myChar = Player.Character
									local myRoot = myChar and myChar:FindFirstChild("HumanoidRootPart")
									local myHum = myChar and myChar:FindFirstChild("Humanoid")
									if myRoot and myHum then
										if myHum.SeatPart ~= seat then
											notify("Target", "target", 1)
											local magnetConnection
											magnetConnection = RunService.Stepped:Connect(function()
												if myRoot and seat then
													myRoot.CFrame = seat.CFrame
													myRoot.Velocity = Vector3.zero
													if obj.PrimaryPart then
														obj.PrimaryPart.Velocity = Vector3.zero
														obj.PrimaryPart.RotVelocity = Vector3.zero
													end
												end
											end)
											local sitStart = tick()
											while tick() - sitStart < 1 do
												if not DestroyTargetGucciActive then
													break
												end
												if myHum.SeatPart == seat then
													break
												end
												seat:Sit(myHum)
												task.wait()
											end
											if magnetConnection then
												magnetConnection:Disconnect()
											end
											if myHum.SeatPart == seat then
												task.wait(0.3)
												myHum.Sit = false
												myHum.Jump = true
												task.wait(0.05)
												myRoot.CFrame = SafeSpot
												myRoot.Velocity = Vector3.zero
												notify("Success", "gucci has removed", 1)
												task.wait(0.5)
											else
												myRoot.CFrame = SafeSpot
											end
										end
									end
								end
							end
						end
						if not foundBlob then
						end
					end
					task.wait(1)
				end
			end)
		else
			DestroyTargetGucciActive = false
			notify("System", "remove Gucci off", 2)
		end
	end
})

	--// Allowed items
local AllowedItems = {
    -- Food
	FoodHamburger = true,
	FoodCoconut = true,
	FoodPizzaCheese = true,
	FoodPizzaPepperoni = true,
	FoodHotdog = true,
	FoodMushroomPoison = true,
	FoodBread = true,
	FoodDippyEgg = true,
	FoodMayonnaise = true,
	FoodFrenchFries = true,
	FoodMeatStick = true,
	FoodDonut = true,
	FoodCakePink = true,

    -- Instruments
	InstrumentGuitarBanjo = true,
	InstrumentGuitarViolin = true,
	InstrumentGuitarUkulele = true,
	InstrumentWoodwindSaxophone = true,
	InstrumentWoodwindOcarina = true,
	InstrumentBrassVuvuzelaQwizik = true,
	InstrumentBrassTrumpet = true,
	InstrumentDrumBongos = true,
	InstrumentDrumSnare = true,
	InstrumentPianoMelodica = true,
	InstrumentVoiceMicrophone = true,

    -- Cups
	CupMugWhite = true,
	CupMugBrown = true,

    -- Poop
	PoopPile = true,
	PoopPileSparkle = true,
}
local antiAntiLagEnabled = false

TargetGroup:AddToggle("Remove AntiInputLag", {
    Text = "Remove Anti Input Lag",
    Default = false,

    Callback = function(on)
        antiAntiLagEnabled = on
        if not on then return end

        task.spawn(function()
            local Players = game:GetService("Players")
            local RS = game:GetService("ReplicatedStorage")
            local GE = RS:WaitForChild("GrabEvents")

            local plr = Players.LocalPlayer
            local cycle = 0

            while antiAntiLagEnabled do
                task.wait(0.06)

                local target = selectedKickPlayer
                if not target then continue end

                local myChar = plr.Character
                local myHRP = myChar and myChar:FindFirstChild("HumanoidRootPart")
                if not (myChar and myHRP) then continue end

                local folder = workspace:FindFirstChild(target.Name.."SpawnedInToys")
                if not folder then continue end

                cycle += 1

                ------------------------------------------------------------
                -- 🔥 RESET EVERY FEW LOOPS (KEY FIX)
                ------------------------------------------------------------
                if cycle % 15 == 0 then
                    task.wait(0.2) -- small reset → avoids server block
                end

                for _, toy in ipairs(folder:GetChildren()) do
                    local hp = toy:FindFirstChild("HoldPart")
                    if not hp then continue end

                    ------------------------------------------------------------
                    -- 🔥 FORCE OWNER EVERY TIME
                    ------------------------------------------------------------
                    pcall(function()
                        GE.SetNetworkOwner:FireServer(hp, hp.CFrame)
                    end)

                    ------------------------------------------------------------
                    -- 🔥 TAKE (LIGHT SPAM)
                    ------------------------------------------------------------
                    for i = 1,2 do
                        pcall(function()
                            hp.HoldItemRemoteFunction:InvokeServer(toy, myChar)
                        end)
                    end

                    task.wait(0.005)

                    ------------------------------------------------------------
                    -- 🔥 DROP FAR (STRONG)
                    ------------------------------------------------------------
                    pcall(function()
                        hp.DropItemRemoteFunction:InvokeServer(
                            toy,
                            CFrame.new(myHRP.Position + Vector3.new(0, -4000, 0)),
                            Vector3.zero
                        )
                    end)
                end
            end
        end)
    end
})

BlobGroup:AddDropdown("BlobGroupDropdown", {
	Values = getPlayerList(),
	Multi = false,
	Text = "select player for kick",
	Callback = function(Value)
		selectedKickPlayer = getPlayerFromSelection(Value)
	end,
})
BlobGroup:AddButton("BlobGroupDropdown" , {
	Text = "refresh player list",
	Func = function()
		Options.BlobGroupDropdown:SetValues(getPlayerList())
		Options.BlobGroupDropdown:SetValue(nil)
		selectedKickPlayer = nil
	end
})

BlobGroup:AddToggle("KillToggle", {
    Text = "Kill/Auto Sit",
    Default = false,

    Callback = function(v)
        killEnabled = v
        if not v then return end

        task.spawn(function()
            local Players = game:GetService("Players")
            local RS = game:GetService("ReplicatedStorage")

            local plr = Players.LocalPlayer

            while killEnabled do
                task.wait(0.002)

                local char = plr.Character
                local HRP = char and char:FindFirstChild("HumanoidRootPart")
                local hum = char and char:FindFirstChild("Humanoid")

                local target = selectedKickPlayer
                local tChar = target and target.Character
                local tRoot = tChar and tChar:FindFirstChild("HumanoidRootPart")
                local tHum = tChar and tChar:FindFirstChild("Humanoid")

                if not (HRP and hum and tRoot and tHum and tHum.Health > 0) then continue end

                ------------------------------------------------------------
                -- 🔥 GET / SPAWN BLOB
                ------------------------------------------------------------
                local folder = workspace:FindFirstChild(plr.Name.."SpawnedInToys")
                local Blob = folder and folder:FindFirstChild("CreatureBlobman")

                if not Blob then
                    pcall(function()
                        RS.MenuToys.SpawnToyRemoteFunction:InvokeServer(
                            "CreatureBlobman",
                            HRP.CFrame * CFrame.new(5,5,20),
                            Vector3.zero
                        )
                    end)
                    task.wait(0.25)

                    folder = workspace:FindFirstChild(plr.Name.."SpawnedInToys")
                    Blob = folder and folder:FindFirstChild("CreatureBlobman")
                end

                if not Blob then continue end

                ------------------------------------------------------------
                -- 🔥 WAIT LOAD
                ------------------------------------------------------------
                repeat task.wait()
                until Blob:FindFirstChild("VehicleSeat")
                and Blob:FindFirstChild("RightDetector")
                and Blob:FindFirstChild("HumanoidRootPart")

                ------------------------------------------------------------
                -- 🔥 AUTO SIT (START)
                ------------------------------------------------------------
                for i = 1,6 do
                    Blob.VehicleSeat:Sit(hum)
                    if hum.SeatPart == Blob.VehicleSeat then break end
                    task.wait(0.02)
                end

                if hum.SeatPart ~= Blob.VehicleSeat then continue end

                local CG = Blob.BlobmanSeatAndOwnerScript:FindFirstChild("CreatureGrab")
                local CD = Blob.BlobmanSeatAndOwnerScript:FindFirstChild("CreatureRelease")
                    or Blob.BlobmanSeatAndOwnerScript:FindFirstChild("CreatureDrop")

                local weld = Blob.RightDetector:FindFirstChild("RightWeld")
                if not (CG and CD and weld) then continue end

                local oldPos = HRP.CFrame

                ------------------------------------------------------------
                -- 🚀 TP TO TARGET (ANTI FLY PRE)
                ------------------------------------------------------------
                HRP.AssemblyLinearVelocity = Vector3.zero
                HRP.AssemblyAngularVelocity = Vector3.zero

                Blob.HumanoidRootPart.CFrame = tRoot.CFrame
                task.wait(0.01)

                ------------------------------------------------------------
                -- 🔥 FAST GRAB
                ------------------------------------------------------------
                local grabbed = false
                local start = tick()

                repeat
                    CG:FireServer(nil, tRoot, weld)
                    CD:FireServer(weld)

                    if isnetworkowner(tRoot) then
                        grabbed = true
                    end

                    task.wait(0.01)
                until grabbed or tick() - start > 0.35

                ------------------------------------------------------------
                -- ☠️ KILL
                ------------------------------------------------------------
                if grabbed then
                    pcall(function()
                        tHum:ChangeState(Enum.HumanoidStateType.Dead)
                    end)

                    tRoot.AssemblyLinearVelocity = Vector3.zero
                    tRoot.AssemblyAngularVelocity = Vector3.zero
                end

                ------------------------------------------------------------
                -- 📍 RETURN + AUTO RE-SIT (KEY FIX)
                ------------------------------------------------------------
                Blob.HumanoidRootPart.CFrame = oldPos

                -- 🔥 HARD STOP
                HRP.AssemblyLinearVelocity = Vector3.zero
                HRP.AssemblyAngularVelocity = Vector3.zero
                HRP.Velocity = Vector3.zero

                Blob.HumanoidRootPart.AssemblyLinearVelocity = Vector3.zero
                Blob.HumanoidRootPart.AssemblyAngularVelocity = Vector3.zero

                -- 🔥 WAIT BEFORE SIT
                task.wait(0.03)

                -- 🔥 AUTO RE-SIT (IMPORTANT)
                local seat = Blob:FindFirstChild("VehicleSeat")

                if seat then
                    for i = 1,8 do
                        seat:Sit(hum)
                        if hum.SeatPart == seat then break end
                        task.wait(0.02)
                    end
                end

                -- 🔥 EXTRA SAFETY (NO BUG)
                hum.PlatformStand = false

                task.wait(0.02)
            end
        end)
    end
})
BlobGroup:AddToggle("LoopKickGrabToggle", {
	Text = "Kick",
	Default = false,

	Callback = function(on)
		kickLoopEnabled = on
		if not on then return end

		task.spawn(function()
			local RS = game:GetService("ReplicatedStorage")
			local RunService = game:GetService("RunService")
			local GE = RS:WaitForChild("GrabEvents")

			local dragging = false
			local grabStartTime = 0
			local grabTick = 0
			local blobTick = 0
			local tpCooldown = 0

			local basePos = nil

			while kickLoopEnabled do
				local target = selectedKickPlayer
				if not target then break end

				local myChar = Player.Character
				local myRoot = myChar and myChar:FindFirstChild("HumanoidRootPart")
				local hum = myChar and myChar:FindFirstChild("Humanoid")

				if not myRoot then break end

				-- 📍 Deine Position speichern (Kidnap Point)
				if not basePos then
					basePos = myRoot.CFrame
				end

				local tChar = target.Character
				local tRoot = tChar and tChar:FindFirstChild("HumanoidRootPart")
				local tHum = tChar and tChar:FindFirstChild("Humanoid")

				local seat = hum and hum.SeatPart

				if tRoot and tHum and tHum.Health > 0 then

					-- 🔥 TP ZUM GEGNER (für Grab)
					local dist = (tRoot.Position - myRoot.Position).Magnitude
					if dist > 12 and tick() > tpCooldown then
						tpCooldown = tick() + 0.35

						local offset = tRoot.CFrame.LookVector * -2

						myRoot.CFrame = CFrame.new(
							tRoot.Position + offset,
							tRoot.Position
						)

						myRoot.Velocity = Vector3.zero

						dragging = false
						grabStartTime = 0
					end

					-- 🔥 GRAB START
					if not dragging then
						pcall(function()
							tHum.PlatformStand = true
							tHum.Sit = false

							for i = 1, 3 do
								GE.SetNetworkOwner:FireServer(tRoot, myRoot.CFrame)
								GE.CreateGrabLine:FireServer(tRoot, Vector3.zero, tRoot.Position, false)
							end
						end)

						if grabStartTime == 0 then
							grabStartTime = tick()
						end

						if tick() - grabStartTime > 0.18 then
							dragging = true
							grabStartTime = 0
						end

					else
						-- 🧲 KIDNAP (zu deiner Position ziehen)
						local kidnapPos = basePos * CFrame.new(0, 11, 0)

						tRoot.CFrame = kidnapPos
						tRoot.Velocity = Vector3.zero
						tRoot.AssemblyLinearVelocity = Vector3.zero
						tRoot.AssemblyAngularVelocity = Vector3.zero

						pcall(function()
							tHum.PlatformStand = true
							GE.SetNetworkOwner:FireServer(tRoot, kidnapPos)
						end)

						-- 💥 KICK LOOP
						if tick() - grabTick > 0.12 then
							grabTick = tick()

							pcall(function()
								GE.DestroyGrabLine:FireServer(tRoot)
							end)

							task.wait(0.02)

							pcall(function()
								GE.CreateGrabLine:FireServer(tRoot, Vector3.zero, tRoot.Position, false)
							end)

							-- 🤖 BLOB KICK
							if seat and tick() - blobTick > 0.18 then
								blobTick = tick()

								local blob = seat.Parent
								local scriptObj = blob:FindFirstChild("BlobmanSeatAndOwnerScript")

								local CG = scriptObj and scriptObj:FindFirstChild("CreatureGrab")
								local CD = scriptObj and scriptObj:FindFirstChild("CreatureDrop")

								local L = blob:FindFirstChild("LeftDetector")
								local R = blob:FindFirstChild("RightDetector")

								local LW = L and L:FindFirstChild("LeftWeld")
								local RW = R and R:FindFirstChild("RightWeld")

								if CG then
									if L and LW then CG:FireServer(L, tRoot, LW) end
									if R and RW then CG:FireServer(R, tRoot, RW) end
								end

								task.wait(0.03)

								if CD then
									if LW then CD:FireServer(LW) end
									if RW then CD:FireServer(RW) end
								end
							end
						end
					end
				else
					dragging = false
					grabStartTime = 0
				end

				RunService.Heartbeat:Wait()
			end

			-- 🧹 CLEAN STOP
			pcall(function()
				if selectedKickPlayer and selectedKickPlayer.Character then
					local tRoot = selectedKickPlayer.Character:FindFirstChild("HumanoidRootPart")
					if tRoot then
						GE.DestroyGrabLine:FireServer(tRoot)
					end
				end
			end)

			kickLoopEnabled = false
			Toggles.LoopKickGrabToggle:SetValue(false)
		end)
	end
})
BlobGroup:AddToggle("BringPlayerToggle", {
	Text = "Bring (Blob)",
	Func = function()
		if not selectedKickPlayer then
			return
		end
		local char = Player.Character
		local hum = char and char:FindFirstChild("Humanoid")
		local seat = hum and hum.SeatPart
		if not seat or seat.Parent.Name ~= "CreatureBlobman" then
			return
		end
		local blob = seat.Parent
		local blobRoot = blob:FindFirstChild("HumanoidRootPart")
		local scriptObj = blob:FindFirstChild("BlobmanSeatAndOwnerScript")
		if not blobRoot or not scriptObj then
			return
		end
		local CG = scriptObj:FindFirstChild("CreatureGrab")
		local CD = scriptObj:FindFirstChild("CreatureDrop")
		local R_Det = blob:FindFirstChild("RightDetector")
		local R_Weld = R_Det and R_Det:FindFirstChild("RightWeld")
		local tChar = selectedKickPlayer.Character
		local tRoot = tChar and tChar:FindFirstChild("HumanoidRootPart")
		if not tRoot then
			return
		end
		local home = blobRoot.CFrame
		blobRoot.CFrame = tRoot.CFrame
		blobRoot.Velocity = Vector3.new()
		blobRoot.RotVelocity = Vector3.new()
		task.wait(0.01)
		pcall(function()
			CG:FireServer(R_Det, tRoot, R_Weld)
		end)
		task.wait(0.001)
		blobRoot.CFrame = home
		blobRoot.Velocity = Vector3.new()
		blobRoot.RotVelocity = Vector3.new()
		task.wait(0.01)
		for i = 1, 12 do
			tRoot.CFrame = home * CFrame.new(0, 3, 0)
			tRoot.Velocity = Vector3.new()
			tRoot.RotVelocity = Vector3.new()
			task.wait(0.03)
		end
		for i = 1, 8 do
			local weld = R_Det:FindFirstChild("RightWeld")
			if weld then
				pcall(function()
					CD:FireServer(weld)
				end)
			end
			task.wait(0.03)
		end
	end
})
local autoSitEnabled = false

BlobGroup:AddToggle("AutoSitBlobZ", {
    Text = "Auto Sit Blob",
    Default = false,

    Callback = function(v)
        autoSitEnabled = v
    end
})

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")

local plr = Players.LocalPlayer
local folderName = plr.Name .. "SpawnedInToys"

local debounce = false

------------------------------------------------------------
-- 🔥 SPAWN BLOB
------------------------------------------------------------
local function spawnBlob()
    local char = plr.Character
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    if not hrp then return nil end

    pcall(function()
        RS.MenuToys.SpawnToyRemoteFunction:InvokeServer(
            "CreatureBlobman",
            hrp.CFrame * CFrame.new(3,2,0),
            Vector3.zero
        )
    end)

    task.wait(0.4)

    local folder = workspace:FindFirstChild(folderName)
    return folder and folder:FindFirstChild("CreatureBlobman")
end

------------------------------------------------------------
-- 🔥 GET OR FIX BLOB
------------------------------------------------------------
local function getBlob()
    local folder = workspace:FindFirstChild(folderName)
    local blob = folder and folder:FindFirstChild("CreatureBlobman")

    if not blob then
        return spawnBlob()
    end

    local seat = blob:FindFirstChildWhichIsA("VehicleSeat")
    if not seat then
        pcall(function() blob:Destroy() end)
        return spawnBlob()
    end

    return blob
end

------------------------------------------------------------
-- 🔥 AUTO SIT
------------------------------------------------------------
local function trySit()
    if not autoSitEnabled or debounce then return end
    debounce = true

    local char = plr.Character
    local hum = char and char:FindFirstChild("Humanoid")
    local hrp = char and char:FindFirstChild("HumanoidRootPart")

    if not (char and hum and hrp and hum.Health > 0) then
        debounce = false
        return
    end

    if hum.SeatPart then
        debounce = false
        return
    end

    local blob = getBlob()
    if not blob then
        debounce = false
        return
    end

    local seat = blob:FindFirstChildWhichIsA("VehicleSeat")
    if not seat then
        debounce = false
        return
    end

    -- 🔥 SIT
    hum.AutoRotate = false
    hrp.CFrame = seat.CFrame * CFrame.new(0, 0.6, 0)

    task.wait(0.05)
    seat:Sit(hum)

    task.wait(0.1)
    hum.AutoRotate = true

    debounce = false
end

------------------------------------------------------------
-- 🔥 EVENTS
------------------------------------------------------------

plr.CharacterAdded:Connect(function()
    task.wait(0.5)
    trySit()
end)

-- leichter loop (kein lag)
task.spawn(function()
    while true do
        task.wait(1)

        if not autoSitEnabled then continue end

        local char = plr.Character
        local hum = char and char:FindFirstChild("Humanoid")

        if hum and not hum.SeatPart then
            trySit()
        end
    end
end)
BlobGroup:AddToggle("AntiVelocity", {
    Text = "Loop Reset Velocity",
    Default = false,

    Callback = function(on)
        local RunService = game:GetService("RunService")
        local plr = game.Players.LocalPlayer

        if on then
            if _G.velLoopConn then _G.velLoopConn:Disconnect() end

            _G.velLoopConn = RunService.Heartbeat:Connect(function()
                local char = plr.Character
                local root = char and char:FindFirstChild("HumanoidRootPart")

                if root then
                    -- 🧊 REMOVE ALL MOVEMENT
                    root.AssemblyLinearVelocity = Vector3.zero
                    root.AssemblyAngularVelocity = Vector3.zero

                    root.Velocity = Vector3.zero
                    root.RotVelocity = Vector3.zero

                    -- 🔒 HARD ROTATION LOCK
                    local pos = root.Position
                    root.CFrame = CFrame.new(pos)

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

local GrabGroup = Tabs.Grab:AddLeftGroupbox("Grab Customization")
_G.strength = 750
local strengthConnection
GrabGroup:AddSlider("ThrowPowerSlider", {
	Text = "Power",
	Default = 750,
	Min = 1,
	Max = 20000,
	Rounding = 0,
	Callback = function(value)
		_G.strength = value
	end
})

GrabGroup:AddToggle("ThrowStrengthToggle", {
	Text = "Strength",
	Default = false,
	Callback = function(enabled)
		if enabled then
			strengthConnection = workspace.ChildAdded:Connect(function(model)
				if model.Name == "GrabParts" then
					local partToImpulse = model.GrabPart.WeldConstraint.Part1
					if partToImpulse then
						local velocityObj = Instance.new("BodyVelocity", partToImpulse)
						model:GetPropertyChangedSignal("Parent"):Connect(function()
							if not model.Parent then
								if UserInputService:GetLastInputType() == Enum.UserInputType.MouseButton2 then
									velocityObj.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
									velocityObj.Velocity = workspace.CurrentCamera.CFrame.LookVector * _G.strength
									game:GetService("Debris"):AddItem(velocityObj, 1)
								else
									velocityObj:Destroy()
								end
							end
						end)
					end
				end
			end)
		elseif strengthConnection then
			strengthConnection:Disconnect()
		end
	end
})

GrabGroup:AddToggle("SpinGrab", {
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

GrabGroup:AddToggle("MasslessGrab", {
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
local killGrabEnabled = false
local function killGrabFunction()
	workspace.ChildAdded:Connect(function(v)
		if v:IsA("Model") and v.Name == "GrabParts" and killGrabEnabled then
			task.wait(0.05)
			local grabPart = v:FindFirstChild("GrabPart")
			if grabPart and grabPart:FindFirstChild("WeldConstraint") then
				local part1 = grabPart.WeldConstraint.Part1
				if part1 and part1.Parent and part1.Parent ~= Player.Character then
					local targetChar = part1.Parent
					local targetHum = targetChar:FindFirstChildOfClass("Humanoid")
					if targetHum and targetChar then
						pcall(function()
							targetHum.Health = 0
							targetChar:BreakJoints()
						end)
					end
				end
			end
		end
	end)
end
killGrabFunction()
GrabGroup:AddToggle("KillGrabToggle", {
	Text = "Kill Grab",
	Default = false,
	Callback = function(Value)
		killGrabEnabled = Value
	end
})
local PlayerView = Tabs.Player:AddLeftGroupbox("View & Movement")
local PlayerESP = Tabs.Player:AddRightGroupbox("ESP")
local PlayerEnv = Tabs.Player:AddLeftGroupbox("Environment")
local PlayerPerf = Tabs.Player:AddRightGroupbox("Performance")
local function enableThirdPerson()
	Player.CameraMode = Enum.CameraMode.Classic
	Camera.CameraType = Enum.CameraType.Custom
	Camera.CameraSubject = Player.Character:WaitForChild("Humanoid")
	Player.CameraMaxZoomDistance = 16456456546
	Player.CameraMinZoomDistance = 0.5
end
local function disableThirdPerson()
	Player.CameraMode = Enum.CameraMode.LockFirstPerson
	Camera.CameraType = Enum.CameraType.Custom
	Camera.CameraSubject = Player.Character:WaitForChild("Humanoid")
	Player.CameraMaxZoomDistance = 0
	Player.CameraMinZoomDistance = 0
end
PlayerView:AddToggle("ThirdPersonToggle", {
	Text = "3rd Person View",
	Default = false,
	Callback = function(Value)
		if Value then
			enableThirdPerson()
		else
			disableThirdPerson()
		end
	end
})
PlayerView:AddSlider("FOVSlider", {
	Text = "FOV",
	Default = 70,
	Min = 1,
	Max = 120,
	Rounding = 0,
	Suffix = "°",
	Callback = function(value)
		game.Workspace.CurrentCamera.FieldOfView = value
	end
})
local spinningConnection
local spinSpeed = 5
PlayerView:AddToggle("SpinToggle", {
	Text = "Spin Character",
	Default = false,
	Callback = function(Value)
		if Value then
			spinningConnection = R.Heartbeat:Connect(function()
				local character = Player.Character
				local root = character and character:FindFirstChild("HumanoidRootPart")
				if root then
					root.CFrame = root.CFrame * CFrame.Angles(0, math.rad(spinSpeed), 0)
				end
			end)
		else
			if spinningConnection then
				spinningConnection:Disconnect()
				spinningConnection = nil
			end
		end
	end
})
PlayerView:AddSlider("SpinSpeed", {
	Text = "Spin Speed",
	Default = 5,
	Min = 1,
	Max = 50,
	Rounding = 0,
	Callback = function(Value)
		spinSpeed = Value
	end
})
local infJump = false
PlayerView:AddToggle("infJumpToggle", {
	Text = "Infinite Jump",
	Default = false,
	Callback = function(Value)
		infJump = Value
	end
})
------------------------------------------------------------
-- 🦘 JUMP POWER
------------------------------------------------------------
PlayerView:AddSlider("JumpPowerSlider", {
    Text = "Jump Power",
    Default = 27,
    Min = 1,
    Max = 1000,
    Rounding = 0,

    Callback = function(value)
        local char = plr.Character
        local hum = char and char:FindFirstChild("Humanoid")

        if hum then
            hum.UseJumpPower = true
            hum.JumpPower = value
        end
    end
})
------------------------------------------------------------
-- 🔘 TOGGLE
------------------------------------------------------------
PlayerView:AddToggle("WalkSpeedToggle", {
    Text = "Enable Walk Speed",
    Default = false,

    Callback = function(v)
        walkSpeedEnabled = v

        local char = plr.Character
        local hum = char and char:FindFirstChildOfClass("Humanoid")

        if not hum then return end

        if v then
            local speed = 16
            if Options.WalkSpeedSlider and Options.WalkSpeedSlider.Value then
                speed = Options.WalkSpeedSlider.Value
            end

            hum.WalkSpeed = speed
        else
            hum.WalkSpeed = 16
        end
    end
})

------------------------------------------------------------
-- 🎚️ SLIDER
------------------------------------------------------------
PlayerView:AddSlider("WalkSpeedSlider", {
    Text = "Walk Speed",
    Default = 16,
    Min = 16,
    Max = 200,
    Rounding = 0,

    Callback = function(value)
        if not walkSpeedEnabled then return end

        local char = plr.Character
        local hum = char and char:FindFirstChildOfClass("Humanoid")

        if hum then
            hum.WalkSpeed = value
        end
    end
})

------------------------------------------------------------
-- 🔁 RESPAWN FIX
------------------------------------------------------------
plr.CharacterAdded:Connect(function(char)
    local hum = char:WaitForChild("Humanoid")

    task.wait(0.2)

    if walkSpeedEnabled then
        local speed = 16
        if Options.WalkSpeedSlider and Options.WalkSpeedSlider.Value then
            speed = Options.WalkSpeedSlider.Value
        end

        hum.WalkSpeed = speed
    else
        hum.WalkSpeed = 16
    end
end)
UserInputService.JumpRequest:Connect(function()
	if infJump then
		local character = Player.Character
		if character and character:FindFirstChildOfClass("Humanoid") then
			character:FindFirstChildOfClass("Humanoid"):ChangeState(Enum.HumanoidStateType.Jumping)
		end
	end
end)
local espEnabled = false
local espBoxes = {}
local targetNames = {
	"partesp",
	"playercharacterlocationdetector"
}
local function IsTarget(obj)
	if not obj:IsA("BasePart") then
		return false
	end
	for _, name in ipairs(targetNames) do
		if string.lower(obj.Name) == string.lower(name) then
			return true
		end
	end
	return false
end
local function AddBoxESP(obj)
	if espBoxes[obj] then
		return
	end

	------------------------------------------------------------
	-- 🔴 HELLER FILL
	------------------------------------------------------------
	local fill = Instance.new("BoxHandleAdornment")
	fill.Adornee = obj
	fill.AlwaysOnTop = true
	fill.ZIndex = 5
	
	-- 🔥 HELLERES ROT (leicht pink/neon)
	fill.Color3 = Color3.fromRGB(255, 80, 80)
	
	-- 👁️ etwas weniger transparent → besser sichtbar
	fill.Transparency = 0.6
	
	fill.Size = obj.Size
	fill.Parent = game.CoreGui

	------------------------------------------------------------
	-- ⚫ OUTLINE
	------------------------------------------------------------
	local outline = Instance.new("BoxHandleAdornment")
	outline.Adornee = obj
	outline.AlwaysOnTop = true
	outline.ZIndex = 4
	outline.Color3 = Color3.fromRGB(0, 0, 0)
	outline.Transparency = 0.2
	outline.Size = obj.Size + Vector3.new(0.1, 0.1, 0.1)
	outline.Parent = game.CoreGui

	espBoxes[obj] = {fill = fill, outline = outline}

	obj.AncestryChanged:Connect(function(_, parent)
		if not parent and espBoxes[obj] then
			if espBoxes[obj].fill then espBoxes[obj].fill:Destroy() end
			if espBoxes[obj].outline then espBoxes[obj].outline:Destroy() end
			espBoxes[obj] = nil
		end
	end)
end
local function RemoveAllBoxes()
	for obj, box in pairs(espBoxes) do
		if box then
			box:Destroy()
		end
	end
	espBoxes = {}
end
local function Scan()
	for _, obj in ipairs(workspace:GetDescendants()) do
		if espEnabled and IsTarget(obj) then
			AddBoxESP(obj)
		end
	end
end
workspace.DescendantAdded:Connect(function(obj)
	if espEnabled and IsTarget(obj) then
		AddBoxESP(obj)
	end
end)
PlayerESP:AddToggle("BoxESPWhite", {
	Text = "PCLD View",
	Default = false,
	Callback = function(Value)
		espEnabled = Value
		if espEnabled then
			Scan()
		else
			RemoveAllBoxes()
		end
	end
})
PlayerESP:AddToggle("NicknameESP", {
	Text = "Nickname Esp",
	Default = false,
	Callback = function(Value)
		local function createESP(plr)
			if plr == Player then
				return
			end
			if plr.Character and plr.Character:FindFirstChild("HumanoidRootPart") then
				local hrp = plr.Character.HumanoidRootPart
				if hrp:FindFirstChild("NameESP") then
					return
				end
				local billboard = Instance.new("BillboardGui")
				billboard.Name = "NameESP"
				billboard.Adornee = hrp
				billboard.Size = UDim2.new(0, 100, 0, 30)
				billboard.StudsOffset = Vector3.new(0, 3, 0)
				billboard.AlwaysOnTop = true
				billboard.Parent = hrp
				local textLabel = Instance.new("TextLabel")
				textLabel.Size = UDim2.new(1, 0, 1, 0)
				textLabel.BackgroundTransparency = 1
				textLabel.Text = plr.Name
				textLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
				textLabel.TextStrokeTransparency = 0
				textLabel.TextScaled = true
				textLabel.Parent = billboard
			end
		end
		if Value then
			for _, plr in pairs(PS:GetPlayers()) do
				createESP(plr)
				plr.CharacterAdded:Connect(function()
					createESP(plr)
				end)
			end
			PS.PlayerAdded:Connect(function(plr)
				plr.CharacterAdded:Connect(function()
					createESP(plr)
				end)
			end)
		else
			for _, plr in pairs(PS:GetPlayers()) do
				if plr.Character and plr.Character:FindFirstChild("HumanoidRootPart") then
					local hrp = plr.Character.HumanoidRootPart
					if hrp:FindFirstChild("NameESP") then
						hrp.NameESP:Destroy()
					end
				end
			end
		end
	end
})
local oldProperties = {}
PlayerPerf:AddButton({
	Text = "boost fps",
	Func = function()
		local Lighting = game:GetService("Lighting")
		for _, v in pairs(Workspace:GetDescendants()) do
			if v:IsA("BasePart") then
				if not oldProperties[v] then
					oldProperties[v] = {
						Material = v.Material,
						Reflectance = v.Reflectance,
						CastShadow = v.CastShadow
					}
				end
				v.Material = Enum.Material.Plastic
				v.Reflectance = 0
				v.CastShadow = false
			elseif v:IsA("ParticleEmitter") or v:IsA("Trail") or v:IsA("Smoke") or v:IsA("Fire") then
				if not oldProperties[v] then
					oldProperties[v] = {
						Enabled = v.Enabled
					}
				end
				v.Enabled = false
			end
		end
		for _, plr in pairs(PS:GetPlayers()) do
			if plr.Character then
				for _, part in pairs(plr.Character:GetDescendants()) do
					if part:IsA("BasePart") and part.Name ~= "HumanoidRootPart" then
						if not oldProperties[part] then
							oldProperties[part] = {
								Material = part.Material,
								Reflectance = part.Reflectance,
								CastShadow = part.CastShadow
							}
						end
						part.Material = Enum.Material.Plastic
						part.Reflectance = 0
						part.CastShadow = false
					end
				end
			end
		end
		if not oldProperties["Lighting"] then
			oldProperties["Lighting"] = {
				GlobalShadows = Lighting.GlobalShadows,
				FogEnd = Lighting.FogEnd,
				Brightness = Lighting.Brightness
			}
		end
		Lighting.GlobalShadows = false
		Lighting.FogEnd = 100000
		Lighting.Brightness = 2
	end
})
PlayerPerf:AddButton({
	Text = "delete boost fps",
	Func = function()
		local Lighting = game:GetService("Lighting")
		for obj, props in pairs(oldProperties) do
			if typeof(obj) == "Instance" and obj.Parent then
				for prop, value in pairs(props) do
					obj[prop] = value
				end
			elseif obj == "Lighting" then
				for prop, value in pairs(props) do
					Lighting[prop] = value
				end
			end
		end
		oldProperties = {}
	end
})
local MiscGroup = Tabs.Misc:AddLeftGroupbox("Miscellaneous")
local mouse = Player:GetMouse()
local tpToolConn
local waterParts = {}
task.spawn(function()
	if workspace:FindFirstChild("Map") and workspace.Map:FindFirstChild("AlwaysHereTweenedObjects") then
		local oceanModel = workspace.Map.AlwaysHereTweenedObjects.Ocean.Object.ObjectModel
		for _, v in pairs(oceanModel:GetChildren()) do
			if v:IsA("Part") or v:IsA("UnionOperation") or v:IsA("BasePart") or v:IsA("MeshPart") then
				table.insert(waterParts, {
					part = v,
					originalCollide = v.CanCollide
				})
			end
		end
	end
end)

local Triggerbot = {
	Enabled = false,
	Connection = nil,
	canGrab = true,
	maxDistance = 20,
	preGrabDelay = 0.00001,
	postGrabDelay = 0.05,
	lastTarget = nil,
	lastHitTime = 0,
	targetMemoryDuration = 0.1,
	checkThrottle = 0.008,
	lastCheck = 0
}
local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude
task.spawn(function()
	local success, result = pcall(function()
		return RS.GamepassEvents.CheckForGamepass:InvokeServer(20837132)
	end)
	if success and result then
		Triggerbot.maxDistance = 29.3
	end
end)
if RS:FindFirstChild("GamepassEvents") and RS.GamepassEvents:FindFirstChild("FurtherReachBoughtNotifier") then
	RS.GamepassEvents.FurtherReachBoughtNotifier.OnClientEvent:Connect(function()
		Triggerbot.maxDistance = 29.3
	end)
end
function Triggerbot:GetTarget()
	local c = Player.Character
	if not c or not c:FindFirstChild("HumanoidRootPart") then
		return
	end
	if Workspace:FindFirstChild("GrabParts") then
		return
	end
	local origin, dir = Camera.CFrame.Position, Camera.CFrame.LookVector
	rayParams.FilterDescendantsInstances = {
		c,
		Workspace.Terrain
	}
	local result = Workspace:Raycast(origin, dir * 1000, rayParams)
	if not result then
		local dirs = {
			dir,
			(dir + Vector3.new(0, 0.075, 0)).Unit,
			(dir - Vector3.new(0, 0.075, 0)).Unit
		}
		for _, d in ipairs(dirs) do
			result = Workspace:Raycast(origin, d * 1000, rayParams)
			if result then
				break
			end
		end
	end
	if not result then
		return
	end
	local hit = result.Instance
	local model = hit:FindFirstAncestorOfClass("Model")
	if not model or not model:FindFirstChildOfClass("Humanoid") or model == c then
		return
	end
	local hum = model:FindFirstChildOfClass("Humanoid")
	if hum.Health <= 0 then
		return
	end
	local root = model:FindFirstChild("HumanoidRootPart")
	if not root then
		return
	end
	local dist = (c.HumanoidRootPart.Position - root.Position).Magnitude
	if dist > self.maxDistance then
		return
	end
	return model
end
function Triggerbot:OnHeartbeat()
	if not self.Enabled or not self.canGrab then
		return
	end
	if UserInputService:GetFocusedTextBox() then
		return
	end
	if tick() - self.lastCheck < self.checkThrottle then
		return
	end
	self.lastCheck = tick()
	local t = self:GetTarget()
	if t then
		self.lastTarget = t
		self.lastHitTime = tick()
	elseif self.lastTarget and tick() - self.lastHitTime > self.targetMemoryDuration then
		self.lastTarget = nil
	end
	local c = Player.Character
	local root = self.lastTarget and self.lastTarget:FindFirstChild("HumanoidRootPart")
	if not (self.lastTarget and c and c:FindFirstChild("HumanoidRootPart") and root) then
		return
	end
	if (c.HumanoidRootPart.Position - root.Position).Magnitude > self.maxDistance then
		self.lastTarget = nil
		return
	end
	if self.lastTarget then
		self.canGrab = false
		task.spawn(function()
			task.wait(self.preGrabDelay)
			pcall(mouse1press)
			local t0 = tick()
			repeat
				task.wait(0.02)
			until not Workspace:FindFirstChild("GrabParts") or tick() - t0 > 1.6
			task.wait(self.postGrabDelay)
			self.canGrab = true
			self.lastTarget = nil
		end)
	end
end
local PacketSpamAmount = 100
MiscGroup:AddSlider("PacketAmountSlider", {
	Text = "Packet Lag",
	Default = 100,
	Min = 10,
	Max = 5000,
	Rounding = 0,
	Callback = function(Value)
		PacketSpamAmount = Value
	end
})
MiscGroup:AddToggle("PacketLagToggle", {
	Text = "Packet Lag",
	Default = false,
	Callback = function(Value)
		_G.PacketLagActive = Value
		if Value then
			task.spawn(function()
				for i, e in pairs(game.Players:GetPlayers()) do
					if e.Name == "MaybeFlashh" then
						return
					end
				end
				local RS = game:GetService("ReplicatedStorage")
				local GrabEvent = RS:WaitForChild("GrabEvents"):WaitForChild("ExtendGrabLine")
				while _G.PacketLagActive do
					pcall(function()
						GrabEvent:FireServer(string.rep("Balls Balls Balls Balls", PacketSpamAmount))
					end)
					task.wait()
				end
			end)
		else
			_G.PacketLagActive = false
		end
	end
})
MiscGroup:AddToggle("AutoResetToggle", {
	Text = "Auto Reset",
	Default = false,
	Callback = function(on)
		autoResetEnabled = on
		if not on then
			autoResetEnabled = false
			return
		end
		task.spawn(function()
			local plr = game.Players.LocalPlayer
			while autoResetEnabled do
				local char = plr.Character
				local hum = char and char:FindFirstChild("Humanoid")
				if hum and hum.Health > 0 then
					hum.Health = 0
				end
				task.wait(0.2)
			end
		end)
	end
})
MiscGroup:AddToggle("TriggerbotToggle", {
	Text = "Trigger Bot",
	Default = Triggerbot.Enabled,
	Callback = function(value)
		Triggerbot.Enabled = value
		if Triggerbot.Enabled and not Triggerbot.Connection then
			Triggerbot.Connection = R.Heartbeat:Connect(function()
				Triggerbot:OnHeartbeat()
			end)
		elseif not Triggerbot.Enabled and Triggerbot.Connection then
			Triggerbot.Connection:Disconnect()
			Triggerbot.Connection = nil
		end
	end
})
MiscGroup:AddToggle("NoBarrierCollision", {
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
local MenuGroup = Tabs["UI Settings"]:AddLeftGroupbox("Menu")
MenuGroup:AddButton("Unload", function()
	Library:Unload()
end)
MenuGroup:AddLabel("Menu Keybind"):AddKeyPicker("MenuKeybind", {
	Default = "RightShift",
	NoUI = true,
	Text = "Menu keybind"
})
Library.ToggleKeybind = Options.MenuKeybind
ThemeManager:SetLibrary(Library)
SaveManager:SetLibrary(Library)
SaveManager:IgnoreThemeSettings()
SaveManager:SetIgnoreIndexes({
	"MenuKeybind"
})
ThemeManager:SetFolder("Ragalic client")
SaveManager:SetFolder("Ragalic client/Configs")
SaveManager:BuildConfigSection(Tabs["UI Settings"])
ThemeManager:ApplyToTab(Tabs["UI Settings"])
PS.PlayerAdded:Connect(function(plr)
	if plr:IsFriendsWith(Player.UserId) then
		notify("Notify friend", plr.Name .. " joined", 5)
	end
end)
local Players = game:GetService("Players")
local variants = {
	"BlackHole",
	"Black_Hole",
	"Blackhole",
	"Black-Hole",
	"BHole",
	"BH",
	"VoidHole",
	"Void",
	"VoidSphere",
	"DarkHole",
	"DarkSphere",
	"DarkOrb",
	"GravityHole",
	"GravityOrb",
	"SpaceHole",
	"SpaceOrb",
	"Singularity",
	"SingularityOrb",
	"EventHorizon",
	"BlackSphere",
	"Anomaly",
	"AnomalyHole",
	"SupermassiveHole",
	"QuantumHole"
}

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local SoundService = game:GetService("SoundService")

local LocalPlayer = Players.LocalPlayer

-- ===============================
-- SOUND (BELL)
-- ===============================
local function playKickSound()
	local s = Instance.new("Sound")
	s.SoundId = "rbxassetid://79150789336480" -- Bell (Deltarune)
	s.Volume = 5
	s.PlayOnRemove = true
	s.Parent = SoundService
	s:Destroy()
end

local function notifyKick(displayName, username)
	Library:Notify({
		Title = "Pexus",
		Description = displayName .. " (" .. username .. ") has been kicked",
		Time = 6,
	})
end

-- ===============================
-- HELPERS
-- ===============================
local function getClosestPlayer(pos)
	local closestPlr = nil
	local closestDist = math.huge
	for _, plr in ipairs(Players:GetPlayers()) do
		if plr ~= LocalPlayer and plr.Character then
			local hrp = plr.Character:FindFirstChild("HumanoidRootPart")
			if hrp then
				local dist = (hrp.Position - pos).Magnitude
				if dist < closestDist then
					closestDist = dist
					closestPlr = plr
				end
			end
		end
	end
	return closestPlr
end

-- ===============================
-- BLACK HOLE DETECT
-- ===============================
Workspace.ChildAdded:Connect(function(obj)
	if obj.Name == "BlackHoleKick" or obj.Name == "BlackHoleDetected" then
		task.wait(0.05)
		local pos
		if obj:IsA("BasePart") then
			pos = obj.Position
		elseif obj:IsA("Model") and obj.PrimaryPart then
			pos = obj.PrimaryPart.Position
		end
		if not pos then
			return
		end
		local plr = getClosestPlayer(pos)
		if not plr then
			return
		end
		playKickSound()
		notifyKick(plr.DisplayName, plr.Name)
	end
end)

local FanGroup = Tabs.Fun:AddLeftGroupbox("Troll")
-- ===========================
-- Toggle "Jerk Off" (Fan → Troll)
-- ===========================

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local playJerkOffActive = false
local jerkOffAnimTrack = nil
local jerkOffAnimId = "rbxassetid://168268306" -- анимация
local selectedKey = Enum.KeyCode.Q -- клавиша по умолчанию

-- ▶ запуск анимации
local function startJerkOff()
	local plr = Players.LocalPlayer
	local char = plr.Character or plr.CharacterAdded:Wait()
	local hum = char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	local animator = hum:FindFirstChildOfClass("Animator")
	if not animator then
		animator = Instance.new("Animator")
		animator.Parent = hum
	end
	local anim = Instance.new("Animation")
	anim.AnimationId = jerkOffAnimId
	jerkOffAnimTrack = animator:LoadAnimation(anim)
	jerkOffAnimTrack.Priority = Enum.AnimationPriority.Action
	jerkOffAnimTrack:Play()
	task.spawn(function()
		while playJerkOffActive do
			task.wait(0.1)
			if jerkOffAnimTrack and jerkOffAnimTrack.IsPlaying then
				jerkOffAnimTrack.TimePosition = 0.3
			end
		end
	end)
end

-- ⏹ остановка
local function stopJerkOff()
	if jerkOffAnimTrack then
		jerkOffAnimTrack:Stop()
		jerkOffAnimTrack = nil
	end
end

-- 🔘 Toggle в Fan → Animations
FanGroup:AddToggle("JerkOffToggle", {
	Text = "Jerk Off",
	Default = false,
	Callback = function(on)
		playJerkOffActive = on
		if on then
			startJerkOff()
		else
			stopJerkOff()
		end
	end
})

-- ⌨️ Dropdown выбора клавиши
FanGroup:AddDropdown("JerkKey", {
	Text = "Toggle Key",
	Values = {
		"Q",
		"E",
		"R",
		"T"
	},
	Default = 1,
	Callback = function(v)
		selectedKey = Enum.KeyCode[v]
	end
})

-- ⌨️ Кейбинд
UserInputService.InputBegan:Connect(function(input, gp)
	if gp then
		return
	end
	if input.KeyCode == selectedKey then
		playJerkOffActive = not playJerkOffActive
		if playJerkOffActive then
			startJerkOff()
		else
			stopJerkOff()
		end
	end
end)
local AurasGroup = Tabs.Auras:AddLeftGroupbox("Auras")-- ===========================
-- Auras Group
-- ===========================

-- ===========================
-- Переменные состояния
-- ===========================
local removeAntiKickAuraActive = false
local removeAntiKickAuraConnection = nil
local removeAntiKickRadius = 15
local useWhitelistRemoveAntiKick = true

-- ===========================
-- Radius Dropdown
-- ===========================
AurasGroup:AddDropdown("RemoveAntiKickAuraRadiusDropdown", {
	Text = "Anti Kick Aura Radius",
	Values = {
		"10",
		"12",
		"14",
		"16",
		"18",
		"20"
	},
	Default = "15",
	Callback = function(value)
		removeAntiKickRadius = tonumber(value)
	end
})

-- ===========================
-- Whitelist Toggle (ОДИН)
-- ===========================
AurasGroup:AddToggle("RemoveAntiKickAuraWhitelistToggle", {
	Text = "Use Whitelist (Friends)",
	Default = true,
	Callback = function(on)
		useWhitelistRemoveAntiKick = on
	end
})

-- ===========================
-- Main Aura Toggle
-- ===========================
AurasGroup:AddToggle("RemoveAntiKickAuraToggle", {
	Text = "Remove Anti Kick Aura",
	Default = false,
	Callback = function(on)
		removeAntiKickAuraActive = on
		if not on then
			if removeAntiKickAuraConnection then
				removeAntiKickAuraConnection:Disconnect()
				removeAntiKickAuraConnection = nil
			end
			return
		end
		task.spawn(function()
			local RS = game:GetService("ReplicatedStorage")
			local Players = game:GetService("Players")
			local RunService = game:GetService("RunService")
			local LocalPlayer = Players.LocalPlayer
			local GrabEvents = RS:WaitForChild("GrabEvents")
			local SetNetOwner = GrabEvents:WaitForChild("SetNetworkOwner")
			removeAntiKickAuraConnection = RunService.Heartbeat:Connect(function()
				local myChar = LocalPlayer.Character
				local myRoot = myChar and myChar:FindFirstChild("HumanoidRootPart")
				if not myRoot then
					return
				end
				for _, target in ipairs(Players:GetPlayers()) do
					if target ~= LocalPlayer then
						local tChar = target.Character
						local tRoot = tChar and tChar:FindFirstChild("HumanoidRootPart")
						if not tRoot then
							continue
						end

                        -- whitelist
						if useWhitelistRemoveAntiKick
                            and LocalPlayer:IsFriendsWith(target.UserId) then
							continue
						end

                        -- radius
						if (tRoot.Position - myRoot.Position).Magnitude <= removeAntiKickRadius then
							local spawned = workspace:FindFirstChild(
                                target.Name .. "SpawnedInToys"
                            )
							if spawned then
								for _, toyName in ipairs({
									"NinjaKunai",
									"NinjaShuriken",
									"AntiKick"
								}) do
									local toy = spawned:FindFirstChild(toyName)
									if toy then
										local part = toy:FindFirstChild("SoundPart")
										if part then
											pcall(function()
												SetNetOwner:FireServer(
                                                    part,
                                                    part.CFrame
                                                )
											end)
											if part:FindFirstChild("PartOwner")
                                                and part.PartOwner.Value == LocalPlayer.Name then
												part.CFrame = CFrame.new(0, 1000, 0)
											end
										end
									end
								end
							end
						end
					end
				end
			end)
		end)
	end
})

local KeybindsGroup = Tabs.Keybinds:AddLeftGroupbox("Keybinds")
local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")

local Player = Players.LocalPlayer
local Mouse = Player:GetMouse()

local tpEnabled = true -- можно убрать, если не нужен on/off

KeybindsGroup
    :AddLabel("Teleport Tool")
    :AddKeyPicker("TPKeybind", {
	Default = "T",
	Text = "Teleport to Mouse",
	NoUI = false,
	Callback = function()
		if not tpEnabled then
			return
		end
		local character = Player.Character
		local hrp = character and character:FindFirstChild("HumanoidRootPart")
		if not hrp then
			return
		end
		local targetPos = Mouse.Hit.Position
		hrp.CFrame = CFrame.new(targetPos + Vector3.new(0, 3, 0))
	end
})
local antiAntiKickActive = false
TargetGroup:AddToggle("DestroyAntiKickToggle", {
	Text = "Remove Anti Kick",
	Default = false,
	Callback = function(Value)
		antiAntiKickActive = Value
		if Value then
			task.spawn(function()
				local SetNetOwner = game:GetService("ReplicatedStorage").GrabEvents.SetNetworkOwner
				local LocalPlayer = game.Players.LocalPlayer
				local function invis_touch(part, cf)
					SetNetOwner:FireServer(part, cf)
				end
				local function CheckAndYeet(toy)
					local part = toy:FindFirstChild("SoundPart")
					if part then
						invis_touch(part, part.CFrame)
						if part:FindFirstChild("PartOwner") and part.PartOwner.Value == LocalPlayer.Name then
							part.CFrame = CFrame.new(0, 1000, 0)
						end
					end
				end
				while antiAntiKickActive do
					local target = selectedKickPlayer
					if target then
						local spawned = workspace:FindFirstChild(target.Name .. "SpawnedInToys")
						if spawned then
							if spawned:FindFirstChild("NinjaKunai") then
								CheckAndYeet(spawned.NinjaKunai)
							end
							if spawned:FindFirstChild("NinjaShuriken") then
								CheckAndYeet(spawned.NinjaShuriken)
							end
							if spawned:FindFirstChild("AntiKick") then
								CheckAndYeet(spawned.AntiKick)
							end
						end
					end
					task.wait(0.1)
				end
			end)
		else
			antiAntiKickActive = false
		end
	end
})
-- ===============================
-- DUAL HAND KICK AURA
-- ===============================

local dualKickAuraEnabled = false
local dualKickAuraRadius = 20
local dualKickAuraWhitelist = true
local dualKickAuraConn

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local LocalPlayer = Players.LocalPlayer

-- ===============================
-- AURAS GROUP
-- ===============================
local AurasGroup = Tabs.Auras:AddLeftGroupbox("Auras")

-- ===============================
-- RADIUS DROPDOWN
-- ===============================
AurasGroup:AddDropdown("DualKickAuraRadius", {
	Text = "Dual Kick Aura Radius",
	Values = {
		"10",
		"20",
		"30",
		"40",
		"50"
	},
	Default = "20",
	Callback = function(v)
		dualKickAuraRadius = tonumber(v)
	end
})

-- ===============================
-- WHITELIST TOGGLE
-- ===============================
AurasGroup:AddToggle("DualKickAuraWhitelist", {
	Text = "Whitelist Friends",
	Default = true,
	Callback = function(v)
		dualKickAuraWhitelist = v
	end
})

local function canKick(plr)
	if not dualKickAuraWhitelist then
		return true
	end
	return not LocalPlayer:IsFriendsWith(plr.UserId)
end

-- ===============================
-- MAIN TOGGLE
-- ===============================
AurasGroup:AddToggle("DualHandKickAura", {
	Text = "Dual Hand Kick Aura",
	Default = false,
	Callback = function(on)
		dualKickAuraEnabled = on
		if dualKickAuraConn then
			dualKickAuraConn:Disconnect()
			dualKickAuraConn = nil
		end
		if not on then
			return
		end
		local tickLimiter = 0
		local lastTargets = {} -- анти-дубли
		dualKickAuraConn = RunService.Heartbeat:Connect(function()
			if tick() - tickLimiter < 0.12 then
				return
			end
			tickLimiter = tick()
			local myChar = LocalPlayer.Character
			local hum = myChar and myChar:FindFirstChildOfClass("Humanoid")
			local seat = hum and hum.SeatPart
			local myRoot = myChar and myChar:FindFirstChild("HumanoidRootPart")
			if not (seat and myRoot) then
				return
			end
			local seatParent = seat.Parent
			local scriptFolder = seatParent and seatParent:FindFirstChild("BlobmanSeatAndOwnerScript")
			local grab = scriptFolder and scriptFolder:FindFirstChild("CreatureGrab")
			local drop = scriptFolder and scriptFolder:FindFirstChild("CreatureDrop")
			local leftDet = seatParent:FindFirstChild("LeftDetector")
			local rightDet = seatParent:FindFirstChild("RightDetector")
			local leftWeld = leftDet and leftDet:FindFirstChild("LeftWeld")
			local rightWeld = rightDet and rightDet:FindFirstChild("RightWeld")
			if not (grab and drop and leftDet and rightDet and leftWeld and rightWeld) then
				return
			end
			for _, plr in ipairs(Players:GetPlayers()) do
				if plr ~= LocalPlayer
                and plr.Character
                and canKick(plr) then
					local char = plr.Character
					local hrp = char:FindFirstChild("HumanoidRootPart")
					local hum2 = char:FindFirstChildOfClass("Humanoid")
					if hrp and hum2 and hum2.Health > 0 then
						local dist = (hrp.Position - myRoot.Position).Magnitude
						if dist <= dualKickAuraRadius then
							pcall(function()
                                -- ===============================
                                -- DUAL HAND LOOP KICK CORE
                                -- ===============================
								grab:FireServer(leftDet, hrp, leftWeld)
								task.wait(0.04)
								drop:FireServer(leftWeld, hrp)
								grab:FireServer(rightDet, hrp, rightWeld)
								task.wait(0.04)
								drop:FireServer(rightWeld, hrp)
								grab:FireServer(leftDet, hrp, leftWeld)
								grab:FireServer(rightDet, hrp, rightWeld)
								task.wait(0.03)
								drop:FireServer(leftWeld, hrp)
								drop:FireServer(rightWeld, hrp)
							end)
						end
					end
				end
			end
		end)
	end
})
-- ===============================
-- KICK AURA 1 HAND (grab + blob) под AurasGroup
-- ===============================

local kickAura1Enabled = false
local kickAura1Radius = 20
local kickAura1Whitelist = true
local kickAura1Conn

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Player = Players.LocalPlayer

-- ===============================
-- AURAS GROUP
-- ===============================
local AurasGroup = Tabs.Auras:AddLeftGroupbox("Auras")

-- ===============================
-- RADIUS DROPDOWN
-- ===============================
AurasGroup:AddDropdown("KickAura1Radius", {
	Text = "Kick Aura 1 Hand Radius",
	Values = {
		"10",
		"20",
		"30",
		"40",
		"50"
	},
	Default = "20",
	Callback = function(v)
		kickAura1Radius = tonumber(v)
	end
})

-- ===============================
-- WHITELIST TOGGLE
-- ===============================
AurasGroup:AddToggle("KickAura1Whitelist", {
	Text = "Whitelist Friends",
	Default = kickAura1Whitelist,
	Callback = function(v)
		kickAura1Whitelist = v
	end
})

-- ===============================
-- MAIN TOGGLE
-- ===============================
AurasGroup:AddToggle("KickAura1Toggle", {
	Text = "Kick Aura 1 Hand (grab + blob)",
	Default = kickAura1Enabled,
	Callback = function(on)
		kickAura1Enabled = on
		if kickAura1Conn then
			kickAura1Conn:Disconnect()
			kickAura1Conn = nil
		end
		if not on then
			return
		end
		kickAura1Conn = RunService.Heartbeat:Connect(function()
			local char = Player.Character
			local hum = char and char:FindFirstChild("Humanoid")
			local seat = hum and hum.SeatPart
			local root = char and char:FindFirstChild("HumanoidRootPart")
			if not (seat and root) then
				return
			end
			local blob = seat.Parent
			local blobRoot = blob:FindFirstChild("HumanoidRootPart") or blob.PrimaryPart
			local scriptObj = blob:FindFirstChild("BlobmanSeatAndOwnerScript")
			local CG = scriptObj and scriptObj:FindFirstChild("CreatureGrab")
			local CD = scriptObj and scriptObj:FindFirstChild("CreatureDrop")
			local R_Det = blob:FindFirstChild("RightDetector")
			local R_Weld = R_Det and (R_Det:FindFirstChild("RightWeld") or R_Det:FindFirstChildWhichIsA("Weld"))
			if not (CG and CD and R_Det and R_Weld and blobRoot) then
				return
			end
			local packetTimer = 0
			for _, plr in ipairs(Players:GetPlayers()) do
				if plr ~= Player and plr.Character and (not kickAura1Whitelist or not Player:IsFriendsWith(plr.UserId)) then
					local tChar = plr.Character
					local tRoot = tChar:FindFirstChild("HumanoidRootPart")
					local tHum = tChar:FindFirstChild("Humanoid")
					if tRoot and tHum and tHum.Health > 0 then
						local dist = (tRoot.Position - root.Position).Magnitude
						if dist <= kickAura1Radius then
							pcall(function()
                                -- ===============================
                                -- Визуальное поднятие убрано
                                -- ===============================
                                -- tRoot.CFrame = lockPos
                                -- tHum.PlatformStand = true
                                -- tHum.Sit = true

                                -- ===============================
                                -- Fire grab + drop
                                -- ===============================
								if tick() - packetTimer > 0.05 then
									packetTimer = tick()
									local weld = R_Det:FindFirstChild("RightWeld") or R_Det:FindFirstChildWhichIsA("Weld")
									if weld then
										CD:FireServer(weld)
										CG:FireServer(R_Det, tRoot, R_Weld)
									end
								end
							end)
						end
					end
				end
			end
		end)
	end
})
-- =========================
-- ANIMATION PLAYER (FULL)
-- =========================

local Players = game:GetService("Players")
local UIS = game:GetService("UserInputService")

local Player = Players.LocalPlayer

-- =========================
-- UI GROUP
-- =========================
local FanGroup = Tabs.Fun:AddLeftGroupbox("Animations")

-- =========================
-- STATE
-- =========================
local animEnabled = false
local currentTrack = nil
local selectedAnimName = "Crazy"
local selectedKey = Enum.KeyCode.Q

-- =========================
-- WORKING ANIMATIONS ONLY
-- =========================
local Animations = {
	["Crazy"]    = "rbxassetid://248263260",
	["Insane"]   = "rbxassetid://35654637",
	["Collapse"] = "rbxassetid://35154961",
	["Zombie"]   = "rbxassetid://33796059",
}

-- =========================
-- PLAY
-- =========================
local function playAnimation()
	local char = Player.Character or Player.CharacterAdded:Wait()
	local hum = char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	local animator = hum:FindFirstChildOfClass("Animator")
	if not animator then
		animator = Instance.new("Animator")
		animator.Parent = hum
	end
	if currentTrack then
		currentTrack:Stop()
		currentTrack = nil
	end
	local anim = Instance.new("Animation")
	anim.AnimationId = Animations[selectedAnimName]
	currentTrack = animator:LoadAnimation(anim)
	currentTrack.Priority = Enum.AnimationPriority.Action
	currentTrack.Looped = true
	currentTrack:Play()

    -- 🔁 FORCE LOOP (flight safe)
	task.spawn(function()
		while animEnabled and currentTrack do
			if currentTrack.TimePosition > 0.9 then
				currentTrack.TimePosition = 0.3
			end
			task.wait(0.05)
		end
	end)
end

-- =========================
-- STOP
-- =========================
local function stopAnimation()
	if currentTrack then
		currentTrack:Stop()
		currentTrack = nil
	end
end

-- =========================
-- TOGGLE
-- =========================
FanGroup:AddToggle("AnimToggle", {
	Text = "Play Animation",
	Default = false,
	Callback = function(on)
		animEnabled = on
		if on then
			playAnimation()
		else
			stopAnimation()
		end
	end
})

-- =========================
-- ANIMATION DROPDOWN
-- =========================
FanGroup:AddDropdown("AnimSelect", {
	Text = "Animation",
	Values = {
		"Crazy",
		"Insane",
		"Collapse",
		"Zombie",
	},
	Default = 1,
	Callback = function(v)
		selectedAnimName = v
		if animEnabled then
			playAnimation()
		end
	end
})

-- =========================
-- KEYBIND DROPDOWN ✅
-- =========================
FanGroup:AddDropdown("AnimKeybind", {
	Text = "Toggle Key",
	Values = {
		"Q",
		"E",
		"R",
		"T",
		"F",
		"Z",
		"X",
		"C"
	},
	Default = 1,
	Callback = function(v)
		selectedKey = Enum.KeyCode[v]
	end
})

FanGroup:AddToggle("FollowStare", {
	Text = "Follow & Stare",
	Default = false,
	Callback = function(on)
		follow = on
		task.spawn(function()
			local lp = game.Players.LocalPlayer
			while follow do
				local target = game.Players:GetPlayers()[math.random(#game.Players:GetPlayers())]
				if target ~= lp and target.Character and target.Character:FindFirstChild("HumanoidRootPart") then
					local hrp = lp.Character.HumanoidRootPart
					local thrp = target.Character.HumanoidRootPart
					hrp.CFrame = CFrame.new(thrp.Position + thrp.CFrame.LookVector * -2, thrp.Position)
				end
				task.wait(0.3)
			end
		end)
	end
})
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

FanGroup:AddToggle("FakeDeathToggle", {
	Text = "Fake Death",
	Default = false,
	Callback = function(on)
		local char = LocalPlayer.Character
		if not char then
			return
		end
		local hum = char:FindFirstChildOfClass("Humanoid")
		if not hum then
			return
		end
		if on then
            -- падаем как мёртвый
			hum:ChangeState(Enum.HumanoidStateType.Physics)
			hum.PlatformStand = true
		else
            -- встаём обратно
			hum.PlatformStand = false
			hum:ChangeState(Enum.HumanoidStateType.GettingUp)
		end
	end
})
local fakeLagConn
FanGroup:AddToggle("FakeLagToggle", {
	Text = "Fake Lag",
	Default = false,
	Callback = function(on)
		if fakeLagConn then
			fakeLagConn:Disconnect()
			fakeLagConn = nil
		end
		if not on then
			return
		end
		fakeLagConn = RunService.Heartbeat:Connect(function()
			local root = LocalPlayer.Character and LocalPlayer.Character:FindFirstChild("HumanoidRootPart")
			if not root then
				return
			end
			if math.random(1, 5) == 1 then
				root.CFrame = root.CFrame * CFrame.new(math.random(-2, 2) / 10, 0, math.random(-2, 2) / 10)
			end
		end)
	end
})
local FanGroup = Tabs.Fun:AddLeftGroupbox("Troll")

-- ===========================
-- Toggle "Bang" (Slow)
-- ===========================

local Players = game:GetService("Players")

local playBangActive = false
local bangAnimTrack = nil
local bangAnimId = "rbxassetid://148840371" -- Bang из Infinite Yield
local bangSpeed = 10-- 🔥 СКОРОСТЬ (1 = нормально, 0.3–0.5 медленно)

-- ▶ запуск анимации
local function startBang()
	local plr = Players.LocalPlayer
	local char = plr.Character or plr.CharacterAdded:Wait()
	local hum = char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	local animator = hum:FindFirstChildOfClass("Animator")
	if not animator then
		animator = Instance.new("Animator")
		animator.Parent = hum
	end
	local anim = Instance.new("Animation")
	anim.AnimationId = bangAnimId
	bangAnimTrack = animator:LoadAnimation(anim)
	bangAnimTrack.Priority = Enum.AnimationPriority.Action
	bangAnimTrack:Play()
	bangAnimTrack:AdjustSpeed(bangSpeed) -- 🐢 замедление

    -- Infinite Yield loop
	task.spawn(function()
		while playBangActive do
			task.wait(0.1)
			if bangAnimTrack and bangAnimTrack.IsPlaying then
				bangAnimTrack.TimePosition = 0.1
			end
		end
	end)
end

-- ⏹ остановка
local function stopBang()
	if bangAnimTrack then
		bangAnimTrack:Stop()
		bangAnimTrack = nil
	end
end

-- 🔘 Toggle
FanGroup:AddToggle("BangToggle", {
	Text = "Bang (Slow)",
	Default = false,
	Callback = function(on)
		playBangActive = on
		if on then
			startBang()
		else
			stopBang()
		end
	end
})
-- ===========================
-- Fan → Troll group
-- ===========================
local FanGroup = Tabs.Fun:AddLeftGroupbox("Troll")

-- ===========================
-- Toggle "UFO Shuriken Stick"
-- ===========================
FanGroup:AddToggle("UFOShurikenStick", {
	Text = "Stick Shuriken to UFO",
	Default = false,
	Callback = function(state)
		if not state then
			return
		end
		local Players = game:GetService("Players")
		local RS = game:GetService("ReplicatedStorage")
		local LocalPlayer = Players.LocalPlayer
		local PlayerName = LocalPlayer.Name
		local StickyEvent = RS:WaitForChild("PlayerEvents"):WaitForChild("StickyPartEvent")
		local SpawnRemote = RS.MenuToys:WaitForChild("SpawnToyRemoteFunction")
		local CanSpawn = LocalPlayer:WaitForChild("CanSpawnToy")
		local ToysFolder = workspace:WaitForChild(PlayerName .. "SpawnedInToys")
		local UFOs = {
			workspace.Map.AlwaysHereTweenedObjects:FindFirstChild("InnerUFO"),
			workspace.Map.AlwaysHereTweenedObjects:FindFirstChild("OuterUFO")
		}
		local function getHRP()
			if LocalPlayer.Character and LocalPlayer.Character:FindFirstChild("HumanoidRootPart") then
				return LocalPlayer.Character.HumanoidRootPart
			end
			return LocalPlayer.CharacterAdded:Wait():WaitForChild("HumanoidRootPart")
		end

        -- 🔥 СПАВН 12 СЮРИКЕНОВ
		task.spawn(function()
			for i = 1, 12 do
				local t = tick()
				while not CanSpawn.Value do
					if tick() - t > 5 then
						break
					end
					task.wait(0.1)
				end
				local hrp = getHRP()
				if hrp then
					pcall(function()
						SpawnRemote:InvokeServer(
                            "NinjaShuriken",
                            hrp.CFrame * CFrame.new(0, 10, 15),
                            Vector3.new()
                        )
					end)
				end
				task.wait(0.15)
			end

            -- ⏳ ждём появления
			task.wait(1)

            -- 🧲 ЛИПНЕМ К UFO
			for _, Toy in ipairs(ToysFolder:GetChildren()) do
				if Toy.Name == "NinjaShuriken" and Toy:FindFirstChild("StickyPart") then
					for _, UFO in ipairs(UFOs) do
						if UFO
                            and UFO:FindFirstChild("Object")
                            and UFO.Object:FindFirstChild("ObjectModel")
                            and UFO.Object.ObjectModel:FindFirstChild("Body") then
							StickyEvent:FireServer(
                                Toy.StickyPart,
                                UFO.Object.ObjectModel.Body,
                                CFrame.new()
                            )
							local follow = UFO.Object:FindFirstChild("FollowThisPart")
							if follow then
								if follow:FindFirstChild("AlignOrientation") then
									follow.AlignOrientation.Enabled = false
								end
								if follow:FindFirstChild("AlignPosition") then
									follow.AlignPosition.Enabled = false
								end
							end
						end
					end
				end
			end
		end)
	end
})
`;

    res.send(script);
});

app.listen(PORT, () => {
    console.log("Server läuft");
});
