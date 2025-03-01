import OpenAI from 'openai';

// Internal API key and rate limiting configuration
const INTERNAL_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key
const MAX_REQUESTS_PER_HOUR = 100;
const REQUEST_TIMESTAMPS: number[] = [];

interface ComponentRequirement {
  type: string;
  properties: {
    [key: string]: any;
  };
}

interface LayoutResponse {
  components: ComponentRequirement[];
  layout: {
    columns: number;
    spacing: number;
  };
}

class AILayoutGenerator {
  private apiUrl: string;
  private designSystem: Map<string, ComponentNode>;

  constructor() {
    // Replace with your deployed server URL
    this.apiUrl = 'https://your-proxy-server.com/analyze-prd';
    this.designSystem = new Map();
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Remove timestamps older than 1 hour
    while (REQUEST_TIMESTAMPS.length > 0 && REQUEST_TIMESTAMPS[0] < oneHourAgo) {
      REQUEST_TIMESTAMPS.shift();
    }

    // Check if we're under the rate limit
    if (REQUEST_TIMESTAMPS.length >= MAX_REQUESTS_PER_HOUR) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Add current timestamp
    REQUEST_TIMESTAMPS.push(now);
    return true;
  }

  async analyzePRD(prd: string): Promise<LayoutResponse> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prd })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze PRD');
      }

      const data = await response.json();
      return data as LayoutResponse;
    } catch (error) {
      console.error('Error analyzing PRD:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to analyze PRD. Please try again.');
    }
  }

  async loadDesignSystem() {
    const components = figma.root.findAll(node => node.type === "COMPONENT") as ComponentNode[];
    
    if (components.length === 0) {
      throw new Error('No components found in the current file. Please add some components to your design system.');
    }

    components.forEach(component => {
      this.designSystem.set(component.name.toLowerCase(), component);
    });

    console.log('Loaded components:', Array.from(this.designSystem.keys()));
  }

  private findMatchingComponent(requirement: ComponentRequirement): ComponentNode | null {
    const componentName = requirement.type.toLowerCase();
    const component = this.designSystem.get(componentName);
    
    if (!component) {
      console.warn(`Component not found: ${requirement.type}. Available components:`, Array.from(this.designSystem.keys()));
    }
    
    return component || null;
  }

  async generateLayout(requirements: LayoutResponse): Promise<void> {
    const { components, layout } = requirements;
    const frame = figma.createFrame();
    frame.name = "Generated Layout";
    frame.layoutMode = "VERTICAL";
    frame.itemSpacing = layout.spacing || 20;
    frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 20;

    let currentRow: FrameNode | null = null;
    let columnCount = 0;

    for (const requirement of components) {
      const component = this.findMatchingComponent(requirement);
      
      if (!component) {
        console.warn(`Component not found: ${requirement.type}`);
        continue;
      }

      if (columnCount === 0 || columnCount >= (layout.columns || 1)) {
        currentRow = figma.createFrame();
        currentRow.layoutMode = "HORIZONTAL";
        currentRow.itemSpacing = layout.spacing || 20;
        frame.appendChild(currentRow);
        columnCount = 0;
      }

      const instance = component.createInstance();
      
      // Apply any specific properties from the requirement
      Object.entries(requirement.properties || {}).forEach(([key, value]) => {
        if (instance.hasOwnProperty(key)) {
          (instance as any)[key] = value;
        }
      });

      if (currentRow) {
        currentRow.appendChild(instance);
      }
      
      columnCount++;
    }

    // Resize the frame to fit its contents
    frame.resize(
      Math.max(...frame.children.map(child => child.width + 40)),
      frame.height
    );

    // Center the frame in the viewport
    figma.viewport.scrollAndZoomIntoView([frame]);
  }
}

// Show the UI
figma.showUI(__html__, { width: 450, height: 550 });

// Initialize the layout generator
const generator = new AILayoutGenerator();

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'generate-layout') {
      const { prd } = msg;
      
      if (!prd.trim()) {
        figma.ui.postMessage({ type: 'error', message: 'Please enter a PRD' });
        return;
      }

      // Load design system components
      try {
        await generator.loadDesignSystem();
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Failed to load design system components' 
        });
        return;
      }

      // Analyze PRD and generate layout
      const layoutRequirements = await generator.analyzePRD(prd);
      await generator.generateLayout(layoutRequirements);

      figma.ui.postMessage({ type: 'success', message: 'Layout generated successfully!' });
    }
  } catch (error) {
    console.error('Error:', error);
    figma.ui.postMessage({ 
      type: 'error', 
      message: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
}; 