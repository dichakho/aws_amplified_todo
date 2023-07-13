/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {API, Auth, graphqlOperation} from 'aws-amplify';
//@ts-ignore
import {withAuthenticator} from 'aws-amplify-react-native';
import React, {useEffect, useState} from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import {
  CreateTodoMutation,
  DeleteTodoMutation,
  ListTodosQuery,
  Todo,
  UpdateTodoMutation,
} from './src/API';
import {GraphQLResult} from '@aws-amplify/api';
import {createTodo, deleteTodo, updateTodo} from './src/graphql/mutations';
import {listTodos} from './src/graphql/queries';

const initialFormState = {name: '', description: '', isDone: false};

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [formState, setFormState] = useState(initialFormState);
  const [todos, setTodos] = useState<(Partial<Todo> | null)[]>([]);
  const [updateTaskId, setUpdateTaskId] = useState<string | null>(null);

  async function fetchTodos() {
    try {
      const todoData = (await API.graphql(
        graphqlOperation(listTodos),
      )) as GraphQLResult<ListTodosQuery>;
      const todoRes = todoData.data?.listTodos?.items;
      if (todoRes) {
        setTodos(todoRes);
      }
    } catch (err) {
      console.log('error fetching todos', err);
    }
  }

  useEffect(() => {
    fetchTodos();
  }, []);

  function setInput(key: string, value: string | boolean) {
    setFormState({...formState, [key]: value});
  }
  // const {signOut} = useAuthenticator();

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  async function signOut() {
    try {
      await Auth.signOut();
    } catch (error) {
      console.log('error signing out: ', error);
    }
  }

  async function addTodo() {
    try {
      if (!formState.name || !formState.description) {
        return;
      }
      const todo = {...formState};
      setFormState(initialFormState);
      const result = (await API.graphql(
        graphqlOperation(createTodo, {input: todo}),
      )) as GraphQLResult<CreateTodoMutation>;
      if (result.data?.createTodo) {
        setTodos([...todos, result.data.createTodo]);
      }
    } catch (err) {
      console.log('error creating todo:', err);
    }
  }

  const handleUpdateTodo = async () => {
    try {
      const updateResult = (await API.graphql(
        graphqlOperation(updateTodo, {
          input: {
            id: updateTaskId,
            name: formState.name,
            description: formState.description,
            isDone: formState.isDone,
          },
        }),
      )) as GraphQLResult<UpdateTodoMutation>;
      if (updateResult.data?.updateTodo) {
        setFormState(initialFormState);
        setUpdateTaskId(null);
        const result = updateResult.data?.updateTodo;
        const copyTodos: typeof todos = JSON.parse(JSON.stringify(todos));
        const updateTodoIndex = copyTodos.findIndex(
          todo => todo?.id === result.id,
        );
        if (updateTodoIndex !== -1) {
          copyTodos[updateTodoIndex] = result;
        }
        setTodos(copyTodos);
      }
    } catch (error) {
      console.log('error :>> handleUpdateTodo', error);
    }
  };

  const upsertTodo = () => {
    if (updateTaskId) {
      handleUpdateTodo();
    } else {
      addTodo();
    }
  };

  const delTodo = async (id?: string) => {
    if (id) {
      try {
        const delResult = (await API.graphql(
          graphqlOperation(deleteTodo, {input: {id}}),
        )) as GraphQLResult<DeleteTodoMutation>;
        if (delResult.data?.deleteTodo) {
          setTodos(todos.filter(todo => todo?.id !== id));
        }
      } catch (error) {
        console.log('error :>> delTodo', error);
      }
    }
  };

  const renderItem = ({item}: {item: Partial<Todo> | null}) => {
    return (
      <View style={styles.todo}>
        <View>
          <Text style={[styles.todoName, item?.isDone && styles.doneText]}>
            {item?.name}
          </Text>
          <Text style={item?.isDone && styles.doneText}>
            {item?.description}
          </Text>
        </View>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => {
              if (item?.name && item?.description && item?.id) {
                setFormState({
                  name: item.name,
                  description: item.description,
                  isDone: !!item.isDone,
                });
                setUpdateTaskId(item.id);
              }
            }}>
            <Text style={styles.itemButtonText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => delTodo(item?.id)}>
            <Text style={styles.itemButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <TextInput
        onChangeText={value => setInput('name', value)}
        style={styles.input}
        value={formState.name}
        placeholder="Name"
      />
      <TextInput
        onChangeText={value => setInput('description', value)}
        style={styles.input}
        value={formState.description}
        placeholder="Description"
      />
      <View style={styles.rowHCenter}>
        <Text>Done</Text>
        <TouchableOpacity
          onPress={() => setInput('isDone', !formState.isDone)}
          style={styles.checkbox}>
          {formState.isDone && (
            <Image source={require('./src/assets/check.png')} />
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={upsertTodo} style={styles.buttonContainer}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
      <FlatList
        style={styles.flexX}
        data={todos}
        renderItem={renderItem}
        keyExtractor={item => `${item?.id}`}
      />
      <TouchableOpacity style={styles.buttonContainer} onPress={signOut}>
        <Text style={styles.buttonText}>Signout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexX: {flex: 1},
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  input: {backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18},
  buttonContainer: {
    alignSelf: 'center',
    backgroundColor: 'black',
    paddingHorizontal: 8,
  },
  buttonText: {color: 'white', padding: 16, fontSize: 18},
  todo: {
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todoName: {fontSize: 20, fontWeight: 'bold'},
  updateBtn: {
    backgroundColor: 'green',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  deleteBtn: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  itemButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
  },
  rowHCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    borderWidth: 1,
    width: 25,
    height: 25,
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {textDecorationLine: 'line-through'},
});

export default withAuthenticator(App);
