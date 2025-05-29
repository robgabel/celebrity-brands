@@ .. @@
 interface RequestData {
   brandId: number;
+  notes?: string;
 }

 Deno.serve(async (req) => {
@@ .. @@
     }
 
     // Get request data
-    const { brandId } = await req.json();
+    const { brandId, notes } = await req.json();
 
     if (!brandId) {
       throw new Error('Brand ID is required');
@@ .. @@
     // Prepare the story generation prompt
     const prompt = `Analyze this brand and create a compelling brand story:
 
+${notes ? `IMPORTANT FOCUS AREA: ${notes}\n\n` : ''}
 Brand Name: ${brand.name}
 Creators: ${brand.creators}
 Description: ${brand.description}
@@ .. @@
 
 Create a brand story that:
 1. Captures the essence and journey of the brand
-2. Highlights key milestones and achievements
-3. Discusses market impact and influence
-4. Analyzes success factors and challenges
+${notes ? '2. Specifically addresses and analyzes the emphasized points\n' : ''}
+${notes ? '3. ' : '2. '}Highlights key milestones and achievements
+${notes ? '4. ' : '3. '}Discusses market impact and influence
+${notes ? '5. ' : '4. '}Analyzes success factors and challenges
 
 Respond with a JSON object containing:
 {
@@ -1,4 +1,4 @@
   "key_events": ["event 1", "event 2", ...],
   "metrics": {
     
}
)"key_metric_1": "value",
-    "key_metric_2": "value"
+    "key_metric_2": "value",
+    ${notes ? '"focus_area_impact": "analysis of emphasized points",' : ''}
   }
 }