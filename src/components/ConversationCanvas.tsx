'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/store/conversation';
import { PERSONA_INFO } from '@/lib/perplexity';

interface ConversationNode {
  id: string;
  message: Message;
  x: number;
  y: number;
  children: string[];
  parent?: string;
  level: number;
  nodeType: 'root' | 'topic' | 'perspective' | 'challenge' | 'solution' | 'evolution';
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
  topicCluster?: string;
  relatedNodes: string[];
}

interface TopicCluster {
  id: string;
  name: string;
  nodes: string[];
  x: number;
  y: number;
  color: string;
}

interface ConversationCanvasProps {
  messages: Message[];
  isAutoConversing: boolean;
  onNodeClick: (nodeId: string) => void;
}

export function ConversationCanvas({ messages, isAutoConversing, onNodeClick }: ConversationCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<ConversationNode[]>([]);
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [viewBox, setViewBox] = useState({ x: -200, y: -100, width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showClusters, setShowClusters] = useState(true);

  // Analyze message content to determine node properties
  const analyzeMessage = (message: Message, index: number): Partial<ConversationNode> => {
    const content = message.content.toLowerCase();
    
    // Determine node type
    let nodeType: ConversationNode['nodeType'] = 'perspective';
    if (index === 0) nodeType = 'root';
    else if (content.includes('challenge') || content.includes('however') || content.includes('but')) nodeType = 'challenge';
    else if (content.includes('solution') || content.includes('recommend') || content.includes('suggest')) nodeType = 'solution';
    else if (content.includes('evolution') || content.includes('explore') || content.includes('consider')) nodeType = 'evolution';
    else if (content.includes('topic') || content.includes('aspect') || content.includes('angle')) nodeType = 'topic';

    // Determine sentiment
    let sentiment: ConversationNode['sentiment'] = 'neutral';
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'benefit', 'advantage', 'opportunity'];
    const negativeWords = ['bad', 'poor', 'negative', 'risk', 'problem', 'issue', 'concern', 'disadvantage'];
    
    const hasPositive = positiveWords.some(word => content.includes(word));
    const hasNegative = negativeWords.some(word => content.includes(word));
    
    if (hasPositive && !hasNegative) sentiment = 'positive';
    else if (hasNegative && !hasPositive) sentiment = 'negative';

    // Determine confidence (based on language certainty)
    let confidence = 0.5;
    if (content.includes('definitely') || content.includes('certainly') || content.includes('clearly')) confidence = 0.9;
    else if (content.includes('probably') || content.includes('likely')) confidence = 0.7;
    else if (content.includes('might') || content.includes('perhaps') || content.includes('maybe')) confidence = 0.3;

    return { nodeType, sentiment, confidence };
  };

  // Create topic clusters
  const createTopicClusters = (nodes: ConversationNode[]): TopicCluster[] => {
    const clusters: TopicCluster[] = [];
    const clusterKeywords = {
      'risks': ['risk', 'danger', 'problem', 'issue', 'concern'],
      'benefits': ['benefit', 'advantage', 'opportunity', 'positive'],
      'alternatives': ['alternative', 'option', 'different', 'instead'],
      'implementation': ['implement', 'execute', 'action', 'plan'],
      'stakeholders': ['stakeholder', 'people', 'team', 'user', 'customer'],
      'timeline': ['time', 'schedule', 'deadline', 'when', 'duration']
    };

    Object.entries(clusterKeywords).forEach(([clusterName, keywords], index) => {
      const clusterNodes = nodes.filter(node => 
        keywords.some(keyword => node.message.content.toLowerCase().includes(keyword))
      );

      if (clusterNodes.length > 0) {
        clusters.push({
          id: clusterName,
          name: clusterName.charAt(0).toUpperCase() + clusterName.slice(1),
          nodes: clusterNodes.map(n => n.id),
          x: 200 + (index % 3) * 300,
          y: 150 + Math.floor(index / 3) * 200,
          color: ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'][index % 6]
        });
      }
    });

    return clusters;
  };

  // Intelligent node positioning
  const calculateNodePosition = (node: ConversationNode, index: number, allNodes: ConversationNode[]): { x: number, y: number } => {
    const baseSpacing = 180;
    const levelHeight = 120;
    
    // Root node at center
    if (node.nodeType === 'root') {
      return { x: 400, y: 100 };
    }

    // Find parent node
    const parentNode = allNodes.find(n => n.children.includes(node.id));
    if (!parentNode) {
      return { x: 400 + (index % 4 - 2) * baseSpacing, y: 100 + levelHeight };
    }

    // Position based on node type and relationship
    const parentX = parentNode.x;
    const parentY = parentNode.y;
    const siblingIndex = parentNode.children.indexOf(node.id);
    const totalSiblings = parentNode.children.length;

    let offsetX = 0;
    let offsetY = levelHeight;

    // Spread siblings horizontally
    if (totalSiblings > 1) {
      offsetX = (siblingIndex - (totalSiblings - 1) / 2) * baseSpacing;
    }

    // Adjust based on node type
    switch (node.nodeType) {
      case 'challenge':
        offsetX += 50; // Slightly to the right
        break;
      case 'solution':
        offsetX -= 50; // Slightly to the left
        break;
      case 'evolution':
        offsetY += 50; // Further down
        break;
    }

    return {
      x: parentX + offsetX,
      y: parentY + offsetY
    };
  };

  // Convert messages to intelligent tree nodes
  useEffect(() => {
    const newNodes: ConversationNode[] = [];

    messages.forEach((message, index) => {
      const analysis = analyzeMessage(message, index);
      
      const node: ConversationNode = {
        id: message.id,
        message,
        x: 0, // Will be calculated
        y: 0, // Will be calculated
        children: [],
        level: 0,
        nodeType: analysis.nodeType || 'perspective',
        sentiment: analysis.sentiment || 'neutral',
        confidence: analysis.confidence || 0.5,
        relatedNodes: [],
        ...analysis
      };

      // Determine parent relationship intelligently
      if (index > 0) {
        // Look for the most relevant parent based on content similarity and conversation flow
        let parentIndex = index - 1;
        
        // If this is a challenge, try to find what it's challenging
        if (node.nodeType === 'challenge') {
          for (let i = index - 1; i >= Math.max(0, index - 3); i--) {
            if (messages[i].persona !== message.persona) {
              parentIndex = i;
              break;
            }
          }
        }
        
        node.parent = messages[parentIndex].id;
        const parentNode = newNodes.find(n => n.id === messages[parentIndex].id);
        if (parentNode) {
          parentNode.children.push(node.id);
        }
      }

      newNodes.push(node);
    });

    // Calculate positions
    newNodes.forEach((node, index) => {
      const position = calculateNodePosition(node, index, newNodes);
      node.x = position.x;
      node.y = position.y;
    });

    // Create clusters
    const newClusters = createTopicClusters(newNodes);

    setNodes(newNodes);
    setClusters(newClusters);
  }, [messages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - deltaX * 0.5,
      y: prev.y - deltaY * 0.5,
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getPersonaColor = (persona: string) => {
    switch (persona) {
      case 'system1': return '#ef4444';
      case 'system2': return '#3b82f6';
      case 'moderator': return '#10b981';
      case 'devilsAdvocate': return '#8b5cf6';
      case 'user': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getNodeTypeIcon = (nodeType: ConversationNode['nodeType']) => {
    switch (nodeType) {
      case 'root': return '🌱';
      case 'topic': return '💭';
      case 'perspective': return '👁️';
      case 'challenge': return '⚡';
      case 'solution': return '💡';
      case 'evolution': return '🔄';
      default: return '💬';
    }
  };

  const getSentimentColor = (sentiment: ConversationNode['sentiment']) => {
    switch (sentiment) {
      case 'positive': return '#10b981';
      case 'negative': return '#ef4444';
      case 'neutral': return '#6b7280';
    }
  };

  const getPersonaInfo = (persona: string) => {
    if (persona === 'user') return { name: 'You', icon: '👤' };
    return PERSONA_INFO[persona as keyof typeof PERSONA_INFO] || { name: persona, icon: '🤖' };
  };

  return (
    <div className="h-full bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden relative">
      {/* Canvas Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-b border-white/10 p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Decision Tree</h3>
            <p className="text-sm text-slate-400">
              {nodes.length} insights • {clusters.length} topics • {isAutoConversing ? 'Live' : 'Paused'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowClusters(!showClusters)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                showClusters ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              Topic Clusters
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isAutoConversing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-400">
                {isAutoConversing ? 'Live' : 'Stopped'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid Background */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Topic Clusters */}
        {showClusters && clusters.map(cluster => (
          <g key={cluster.id}>
            <ellipse
              cx={cluster.x}
              cy={cluster.y}
              rx="120"
              ry="80"
              fill={cluster.color}
              opacity="0.1"
              stroke={cluster.color}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <text
              x={cluster.x}
              y={cluster.y - 60}
              textAnchor="middle"
              className="text-sm font-medium fill-white"
            >
              {cluster.name}
            </text>
          </g>
        ))}

        {/* Connection Lines */}
        {nodes.map(node => 
          node.children.map(childId => {
            const childNode = nodes.find(n => n.id === childId);
            if (!childNode) return null;
            
            // Different line styles based on relationship type
            const isChallenge = childNode.nodeType === 'challenge';
            const isSolution = childNode.nodeType === 'solution';
            
            return (
              <line
                key={`${node.id}-${childId}`}
                x1={node.x}
                y1={node.y + 40}
                x2={childNode.x}
                y2={childNode.y - 40}
                stroke={isChallenge ? '#ef4444' : isSolution ? '#10b981' : 'rgba(255,255,255,0.3)'}
                strokeWidth={isChallenge || isSolution ? "3" : "2"}
                strokeDasharray={isChallenge ? "5,5" : "none"}
                markerEnd="url(#arrowhead)"
                opacity="0.7"
              />
            );
          })
        )}

        {/* Arrow Markers */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                  refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.4)" />
          </marker>
        </defs>

        {/* Conversation Nodes */}
        {nodes.map(node => {
          const personaInfo = getPersonaInfo(node.message.persona);
          const personaColor = getPersonaColor(node.message.persona);
          const sentimentColor = getSentimentColor(node.sentiment);
          const isSelected = selectedNode === node.id;
          
          return (
            <g 
              key={node.id} 
              className="cursor-pointer" 
              onClick={() => {
                setSelectedNode(isSelected ? null : node.id);
                onNodeClick(node.id);
              }}
              filter={isSelected ? "url(#glow)" : "none"}
            >
              {/* Node Background */}
              <rect
                x={node.x - 100}
                y={node.y - 40}
                width="200"
                height="80"
                rx="12"
                fill="rgba(0,0,0,0.8)"
                stroke={isSelected ? '#ffffff' : personaColor}
                strokeWidth={isSelected ? "3" : "2"}
                className="hover:fill-black/90 transition-all"
              />
              
              {/* Sentiment Indicator */}
              <rect
                x={node.x - 95}
                y={node.y - 35}
                width="8"
                height="70"
                rx="4"
                fill={sentimentColor}
                opacity="0.6"
              />
              
              {/* Confidence Indicator */}
              <rect
                x={node.x + 87}
                y={node.y - 35}
                width="8"
                height={70 * node.confidence}
                rx="4"
                fill="#3b82f6"
                opacity="0.6"
              />
              
              {/* Node Type Icon */}
              <circle
                cx={node.x - 70}
                cy={node.y - 15}
                r="12"
                fill={personaColor}
                opacity="0.2"
              />
              <text
                x={node.x - 70}
                y={node.y - 9}
                textAnchor="middle"
                className="text-sm fill-white"
              >
                {getNodeTypeIcon(node.nodeType)}
              </text>
              
              {/* Persona Info */}
              <text
                x={node.x - 50}
                y={node.y - 20}
                className="text-xs font-medium fill-white"
              >
                {personaInfo.name}
              </text>
              
              {/* Message Preview */}
              <text
                x={node.x - 50}
                y={node.y - 5}
                className="text-xs fill-slate-300"
              >
                {node.message.content.slice(0, 30)}...
              </text>
              
              {/* Timestamp */}
              <text
                x={node.x - 50}
                y={node.y + 10}
                className="text-xs fill-slate-500"
              >
                {node.message.timestamp.toLocaleTimeString()}
              </text>
              
              {/* Confidence Text */}
              <text
                x={node.x - 50}
                y={node.y + 25}
                className="text-xs fill-blue-400"
              >
                {Math.round(node.confidence * 100)}% confident
              </text>
              
              {/* Active Indicator */}
              {node.id === messages[messages.length - 1]?.id && (
                <circle
                  cx={node.x + 85}
                  cy={node.y - 25}
                  r="4"
                  fill="#10b981"
                  className="animate-pulse"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Positive sentiment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Negative sentiment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Confidence level</span>
          </div>
        </div>
      </div>

      {/* Canvas Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setViewBox({ x: -200, y: -100, width: 1200, height: 800 })}
          className="px-3 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-white text-sm border border-white/20 transition-colors"
        >
          Reset View
        </button>
        <button
          onClick={() => setViewBox(prev => ({ ...prev, width: prev.width * 0.8, height: prev.height * 0.8 }))}
          className="px-3 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-white text-sm border border-white/20 transition-colors"
        >
          Zoom In
        </button>
        <button
          onClick={() => setViewBox(prev => ({ ...prev, width: prev.width * 1.2, height: prev.height * 1.2 }))}
          className="px-3 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-white text-sm border border-white/20 transition-colors"
        >
          Zoom Out
        </button>
      </div>
    </div>
  );
} 