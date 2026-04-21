# Children’s Story Target Workflow

## Purpose
Use the children’s story flow as the first concrete proof that Workflow Studio can assemble a real workflow from reusable node primitives.

This workflow should validate the node system rather than create story-specific node sprawl.

## Product rule
Do not represent story creation steps as bespoke reusable node types.

Avoid reusable nodes like:
- Story Idea
- Write Story
- Edit Story

Instead, use general nodes configured for this workflow.

## Target workflow shape
- Manual Trigger
- Structured Prompt
- Prompt
- Prompt or Structured Prompt
- Google Drive Save File
- Download File

## Recommended first mapping

### 1. Manual Trigger
Purpose:
- Start the workflow from the app.

### 2. Structured Prompt — Generate story idea
Purpose:
- Produce a structured story concept.

Expected output example:
- title
- mainCharacter
- setting
- conflict
- lesson
- premise

### 3. Prompt — Write story draft
Purpose:
- Turn the structured story idea into a full story draft.

Expected output example:
- storyText

Optional output:
- title if the node returns it explicitly

### 4. Prompt or Structured Prompt — Edit/polish story
Purpose:
- Improve clarity, rhythm, warmth, and read-aloud quality.

Expected output example:
- editedText
- optional notes

### 5. Google Drive Save File
Purpose:
- Save the edited story to Drive.

Expected output example:
- file id
- file name
- destination
- link if available

### 6. Download File
Purpose:
- Provide a user download of the edited story.

Expected output example:
- file name
- content type
- download-ready artifact

## Testing rule
Each node should be built and verified individually before trusting the full workflow.

## Recommended build/test order
1. Manual Trigger
2. Structured Prompt
3. Prompt
4. Download File
5. Google Drive Save File

## Verification approach
For each node:
1. verify configuration UI
2. verify real execution path
3. verify output shape
4. verify failure handling
5. verify use inside the children’s story workflow

## Success condition
The children’s story workflow should eventually be able to:
- generate a structured story idea
- write a full draft
- edit/polish the story
- save the result to Drive
- offer a local download
- expose the terminal node result clearly in the app

That should happen using general reusable nodes, not story-specific custom node types.