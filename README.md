# Electric Field Simulator

An interactive simulation of electric fields created with HTML5 Canvas and JavaScript.

## Features

- Add positive and negative point charges
- Drag charges to reposition them
- Visualize electric field lines in real-time
- Predefined scenarios for common charge configurations
- Clean, intuitive interface

## Project Structure

```
electric-fields/
│
├── index.html                # Main page
├── style/
│   ├── main.css              # General styles
│   ├── field.css             # Canvas area styles
│   └── controls.css          # Control panel styles
│
│
├── data/
│   └── presets.json          # Preset configurations for common scenarios
│
└── README.md                 # This file
```

## How to Use

1. Open `index.html` in a web browser
2. Use the control panel to select a tool:
   - **[+] 添加正电荷**: Adds a red positive charge
   - **[-] 添加负电荷**: Adds a blue negative charge
   - **[拖拽] 移动电荷**: Drag existing charges to new positions
   - **[清除] 清除全部**: Removes all charges from the simulation
3. Click on the canvas to add charges or drag existing ones
4. Watch as electric field lines are automatically calculated and displayed
5. Load predefined scenarios using the dropdown menu:
   - **电偶极子**: A pair of equal and opposite charges
   - **四极子**: Two pairs of dipoles
   - **线状分布**: A line of positive charges

## Physics

The simulation uses Coulomb's law to calculate the electric field at each point:

E = k × q / r²

Field lines are drawn by following the direction of the electric field from positive to negative charges.