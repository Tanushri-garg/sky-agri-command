# AgriDrone Command

Build a complete full-stack web application called:

“AgriDrone – Agriculture IoT-Based Pesticide Spraying Drone”

This is a ground-control dashboard for an agricultural pesticide spraying quadcopter.

IMPORTANT:

Create the application with a clean modular architecture so that the backend, database, Pixhawk and ESP32 integration can be changed later without rewriting the frontend.

Do NOT hard-code hardware communication directly into UI components.

The application should initially run in DEMO/SIMULATION MODE using mock telemetry data. Real hardware integration must be implemented behind a replaceable service/API layer.

==================================================

1. TECHNOLOGY STACK

==================================================

Frontend:

- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui

- Lucide icons

- React Router

- Recharts

- Leaflet / React Leaflet for maps

Backend:

- Use a clean REST API architecture.

- Use Supabase for authentication and database if supported.

- Keep hardware communication in separate service modules.

- Prepare the architecture for WebSocket/live telemetry later.

Database:

Use PostgreSQL/Supabase.

The database design must be modular and easy to modify later.

==================================================

2. MAIN UI DESIGN

==================================================

Create a professional dark military/industrial agriculture dashboard.

Design style:

- Dark green / black background

- Agricultural green accent

- Clean cards

- Rounded corners

- Thin borders

- Modern typography

- Minimal animations

- Responsive design

- Desktop-first but mobile friendly

The dashboard should look like a professional UAV Ground Control Station.

Left sidebar:

1. Dashboard

2. Live Flight

3. Mission Planner

4. Spray Control

5. Sensors

6. Telemetry

7. Flight Logs

8. Settings

Top header:

- Drone ID

- Connection status

- GPS status

- Battery percentage

- Telemetry signal

- Current time

- Simulation Mode indicator

- Emergency Stop button

==================================================

3. DASHBOARD

==================================================

Create a complete dashboard showing:

Drone:

- Drone ID

- Connection status

- Armed / Disarmed

- Flight mode

Battery:

- Battery percentage

- Battery voltage

- Battery warning

GPS:

- Latitude

- Longitude

- Number of satellites

- GPS fix status

Flight:

- Altitude

- Ground speed

- Vertical speed

- Heading

Spray:

- Tank percentage

- Flow rate

- Pump status

- Spray status

Mission:

- Mission name

- Mission progress

- Waypoints completed

- Total waypoints

- Distance

- Estimated remaining time

Show a large live map.

Map should display:

- Drone current position

- Flight path

- Waypoints

- Mission route

- Home location

- Spray area

- Optional obstacle markers

==================================================

4. LIVE FLIGHT PAGE

==================================================

Create a dedicated Live Flight page.

Show:

- Large live map

- Drone marker

- Current coordinates

- Altitude

- Speed

- Heading

- GPS satellites

- Battery

- Signal strength

Flight controls:

ARM

DISARM

TAKE OFF

LAND

RETURN TO HOME

HOLD POSITION

EMERGENCY STOP

IMPORTANT:

Initially these controls must work only in SIMULATION MODE.

Create a hardware abstraction layer so that later these functions can call real backend APIs.

Example conceptual structure:

frontend

    ↓

API service

    ↓

backend controller

    ↓

hardware adapter

    ↓

Pixhawk / ESP32

Do not directly connect React buttons to hardware.

==================================================

5. MISSION PLANNER

==================================================

Create a professional mission planner.

Features:

- Interactive map

- Click map to create waypoints

- Drag waypoints

- Delete waypoint

- Clear all waypoints

- Save mission

- Load mission

- Start mission

- Pause mission

- Resume mission

- Abort mission

Show mission information:

- Mission name

- Area

- Distance

- Number of waypoints

- Estimated flight time

- Estimated spray quantity

Create a simple agricultural grid/route planning option.

The user should be able to create a field spraying route.

Do not assume a fixed field size.

==================================================

6. SPRAY CONTROL

==================================================

Create a dedicated Spray Control page.

Show:

Tank:

- Tank capacity

- Current tank level

- Tank percentage

- Low-level warning

Pump:

- Pump ON/OFF

- Pump state

- Pump voltage if available

Flow:

- Current flow rate

- Total sprayed quantity

- Flow sensor status

Nozzles:

- Nozzle count

- Spray status

Controls:

START SPRAY

STOP SPRAY

Add safety conditions:

- Do not allow spraying if drone is not armed in real hardware mode.

- Do not allow spraying when tank is empty.

- Show warning if flow sensor detects no flow while pump is active.

- Show warning when battery is critically low.

In simulation mode, allow these states to be demonstrated safely.

==================================================

7. SENSORS PAGE

==================================================

Display all IoT sensors.

Sensors:

1. YF-S401 flow sensor

2. Float water/pesticide level sensor

3. Battery voltage sensor

4. HC-SR04 ultrasonic sensors

5. Benewake TFmini-S LiDAR

6. Neo-M8N GPS

7. Telemetry link

For every sensor show:

- Sensor name

- Current value

- Unit

- Online/offline

- Last update

- Warning status

Create a reusable SensorCard component.

==================================================

8. TELEMETRY PAGE

==================================================

Create live telemetry dashboard.

Show:

- Latitude

- Longitude

- Altitude

- Speed

- Vertical speed

- Heading

- Battery voltage

- Battery percentage

- GPS satellites

- GPS fix

- Signal strength

- Tank level

- Flow rate

- Distance to home

- Flight mode

Add live charts:

- Battery voltage

- Battery percentage

- Altitude

- Speed

- Flow rate

Use Recharts.

Charts should update automatically when telemetry changes.

==================================================

9. FLIGHT LOGS

==================================================

Create flight history.

Database table:

flight_logs

Fields:

- id

- drone_id

- mission_id

- start_time

- end_time

- duration

- distance

- battery_start

- battery_end

- spray_used

- status

Statuses:

Completed

Aborted

Failed

In Progress

Features:

- Search

- Filter

- Sort

- View details

- Export CSV

- Delete log

==================================================

10. DATABASE DESIGN

==================================================

Create these tables:

users

drones:

- id

- name

- model

- status

- battery

- firmware_version

- created_at

missions:

- id

- drone_id

- name

- area

- distance

- estimated_time

- status

- created_at

waypoints:

- id

- mission_id

- sequence

- latitude

- longitude

- altitude

telemetry:

- id

- drone_id

- timestamp

- latitude

- longitude

- altitude

- speed

- heading

- battery_voltage

- battery_percentage

- gps_satellites

- signal_strength

- tank_level

- flow_rate

- flight_mode

spray_sessions:

- id

- drone_id

- mission_id

- start_time

- end_time

- total_sprayed

- average_flow

- status

flight_logs:

- id

- drone_id

- mission_id

- start_time

- end_time

- duration

- distance

- battery_start

- battery_end

- spray_used

- status

sensor_readings:

- id

- drone_id

- sensor_name

- value

- unit

- timestamp

- status

==================================================

11. BACKEND API

==================================================

Create clean REST API endpoints.

Drone:

GET /api/drones

GET /api/drones/:id

POST /api/drones

PUT /api/drones/:id

Flight:

POST /api/drones/:id/arm

POST /api/drones/:id/disarm

POST /api/drones/:id/takeoff

POST /api/drones/:id/land

POST /api/drones/:id/rtl

POST /api/drones/:id/hold

POST /api/drones/:id/emergency-stop

Mission:

GET /api/missions

GET /api/missions/:id

POST /api/missions

PUT /api/missions/:id

DELETE /api/missions/:id

POST /api/missions/:id/start

POST /api/missions/:id/pause

POST /api/missions/:id/resume

POST /api/missions/:id/abort

Waypoints:

GET /api/missions/:id/waypoints

POST /api/missions/:id/waypoints

PUT /api/waypoints/:id

DELETE /api/waypoints/:id

Spray:

GET /api/spray/status

POST /api/spray/start

POST /api/spray/stop

Telemetry:

GET /api/telemetry/latest

GET /api/telemetry/history

Sensors:

GET /api/sensors

GET /api/sensors/:name

Logs:

GET /api/logs

GET /api/logs/:id

DELETE /api/logs/:id

==================================================

12. HARDWARE ABSTRACTION

==================================================

VERY IMPORTANT:

Do NOT directly implement Pixhawk communication inside React.

Create a hardware adapter interface.

For example:

HardwareAdapter

Methods:

connect()

disconnect()

getTelemetry()

arm()

disarm()

takeoff()

land()

returnToHome()

hold()

startMission()

pauseMission()

stopMission()

startSpray()

stopSpray()

Create:

MockHardwareAdapter

for simulation mode.

Later create:

PixhawkAdapter

for Pixhawk 2.4.8 / MAVLink communication.

Also create:

ESP32Adapter

for spray system and IoT sensors.

The frontend should not need to change when switching between MockHardwareAdapter and real hardware adapters.

==================================================

13. SIMULATION MODE

==================================================

Create a Simulation Mode toggle.

When enabled:

- Generate realistic telemetry automatically.

- Battery slowly decreases.

- GPS remains fixed around a configurable location.

- Altitude changes slightly.

- Speed changes.

- Heading changes.

- Tank decreases when spraying.

- Flow rate becomes active when spray is ON.

- Mission progress increases during mission.

Show clearly:

SIMULATION MODE

When simulation is enabled, NEVER send real hardware commands.

==================================================

14. PIXHAWK PREPARATION

==================================================

Prepare backend architecture for:

Pixhawk 2.4.8

Communication protocol:

MAVLink

Possible future connection:

Pixhawk

    ↓

MAVLink

    ↓

Backend hardware adapter

    ↓

REST/WebSocket

    ↓

React dashboard

Do not claim that the browser directly controls Pixhawk.

Keep this integration replaceable.

==================================================

15. ESP32 PREPARATION

==================================================

Prepare architecture for ESP32.

ESP32 will eventually handle:

- Flow sensor

- Float switch

- Pump control

- MOSFET

- Battery voltage sensor

- Optional obstacle sensors

Communication:

ESP32

    ↓

Wi-Fi

    ↓

Backend API / MQTT / WebSocket

    ↓

Dashboard

Keep communication configurable.

Do not hard-code IP addresses.

Create environment variables for:

BACKEND_URL

WEBSOCKET_URL

ESP32_URL

DRONE_ID

SIMULATION_MODE

==================================================

16. AUTHENTICATION

==================================================

Add login page.

Fields:

Email

Password

Use Supabase authentication if available.

Protect dashboard routes after login.

Add logout.

==================================================

17. SETTINGS

==================================================

Create Settings page.

Sections:

Drone Settings

- Drone ID

- Model

- Firmware version

- Maximum altitude

- Maximum speed

- Return-to-home altitude

Spray Settings

- Tank capacity

- Minimum tank level

- Flow rate limit

Safety Settings

- Minimum battery

- Maximum altitude

- Obstacle distance

- GPS minimum satellites

Communication Settings

- Backend URL

- WebSocket URL

- ESP32 URL

- Simulation mode

All settings should be editable.

Do not hard-code these values in components.

==================================================

18. SAFETY

==================================================

Add safety warnings throughout the dashboard.

Examples:

LOW BATTERY

LOW TANK

GPS LOST

TELEMETRY LOST

OBSTACLE DETECTED

FLOW SENSOR ERROR

PUMP ERROR

Emergency Stop should clearly indicate that in DEMO MODE it only changes simulated state.

Real hardware commands must remain behind the backend hardware adapter.

==================================================

19. CODE STRUCTURE

==================================================

Use a clean folder structure similar to:

src/

  components/

  pages/

  layouts/

  hooks/

  services/

  api/

  types/

  utils/

  data/

backend/

  controllers/

  routes/

  services/

  hardware/

  adapters/

  database/

Create reusable components.

Avoid putting everything into one huge file.

Use TypeScript types/interfaces for:

Drone

Telemetry

Mission

Waypoint

Sensor

SpraySession

FlightLog

==================================================

20. ERROR HANDLING

==================================================

Add proper:

- Loading states

- Error states

- Empty states

- API error handling

- Connection lost indicator

- Retry button

If backend is unavailable, frontend should gracefully fall back to simulation mode if enabled.

==================================================

21. RESPONSIVE DESIGN

==================================================

Desktop:

Full sidebar + dashboard.

Tablet:

Collapsible sidebar.

Mobile:

Bottom navigation or collapsible menu.

Map and telemetry cards must remain usable on smaller screens.

==================================================

22. DEMO DATA

==================================================

Provide realistic demo data for:

Drone ID:

AGRI-DRONE-01

Battery:

78%

Battery voltage:

15.4V

GPS:

12 satellites

Altitude:

12.5m

Speed:

4.2m/s

Tank:

72%

Flow:

2.1 L/min

Signal:

92%

Flight mode:

Loiter

Use realistic Indian agricultural field coordinates for the demo map, but make them configurable.

==================================================

23. IMPORTANT FUTURE EDITABILITY

==================================================

Design everything so that later I can easily change:

- Drone model

- Pixhawk version

- ESP32

- Sensors

- API URL

- Database

- Map provider

- Telemetry protocol

- Spray pump

- Number of nozzles

- Tank capacity

- Safety limits

Put configurable values into environment variables or settings.

Do not hard-code hardware-specific values throughout the application.

==================================================

24. FINAL REQUIREMENT

==================================================

Build the complete application now.

First ensure the application works completely in DEMO/SIMULATION MODE.

Every page should be functional.

Navigation must work.

Charts must work.

Map must work.

Waypoints must work.

Mission creation must work.

Spray simulation must work.

Telemetry must update.

Flight logs must work.

Settings must work.

Authentication should work if Supabase is configured.

Clearly label hardware functions as SIMULATION until the real Pixhawk/ESP32 backend adapter is configured.

Also provide a clear README explaining:

1. How to run the project

2. Environment variables

3. Database setup

4. How simulation mode works

5. Where the Pixhawk adapter will be added

6. Where the ESP32 adapter will be added

7. How to replace mock APIs with real APIs

8. How to deploy the frontend and backend

Do not remove functionality just to simplify the implementation.

Prioritize modularity, maintainability and future hardware integration.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sky-agri-command.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f17795d-1340-4b53-bba4-1ef886754b66).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
